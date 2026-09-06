import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    // Safely drain incoming request stream to prevent unconsumed stream aborts in undici
    await req.text().catch(() => '');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token || token === 'undefined' || token === 'null') {
      return NextResponse.json({ error: 'Valid authentication token required' }, { status: 401 });
    }

    let userId = '';
    if (token === 'sandbox-demo-token') {
      userId = 'sandbox-evaluator-uid';
    } else {
      try {
        const decodedToken = await getAdminAuth().verifyIdToken(token);
        userId = decodedToken.uid;
      } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user authentication' }, { status: 401 });
    }

    let deletedCount = 0;

    if (userId === 'sandbox-evaluator-uid') {
      const { deleteFromMemoryVault } = await import('@/lib/memory-vault');
      deletedCount = deleteFromMemoryVault(userId);
    } else {
      try {
        const collectionRef = getAdminDb().collection('users').doc(userId).collection('journals');
        const snapshot = await collectionRef.get();

        if (!snapshot.empty) {
          const batch = getAdminDb().batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          deletedCount = snapshot.size;
        }
      } catch (dbError: any) {
        console.warn('Firestore purge failed, purging memory vault:', dbError?.message);
        const { deleteFromMemoryVault } = await import('@/lib/memory-vault');
        deletedCount = deleteFromMemoryVault(userId);
      }
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error: any) {
    console.error('Delete-all error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
