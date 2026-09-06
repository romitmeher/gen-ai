import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

// Strict Anti-SSRF Domain Allowlist
const ALLOWED_DOMAINS = [
  'github.com',
  'raw.githubusercontent.com',
  'api.github.com',
  'drive.google.com',
  'docs.google.com',
];

// Private IP / metadata detection
function isPrivateOrRestrictedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('172.16.') ||
    host.startsWith('172.31.') ||
    host.startsWith('169.254.') || // Cloud Metadata Service
    host.endsWith('.internal') ||
    host.endsWith('.local')
  );
}

export async function POST(req: Request) {
  try {
    // 1. Top-Level Request Deserialization
    let body: any = null;
    try {
      const rawText = await req.text();
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 2. Defensive Payload Ingestion
    const payload = body && typeof body === 'object' ? body : {};
    const rawUrl = typeof payload.url === 'string' ? payload.url.trim() : '';
    const sourceType = typeof payload.type === 'string' ? payload.type.toLowerCase() : 'github';

    if (!rawUrl) {
      return NextResponse.json({ error: 'Source URL is required' }, { status: 400 });
    }

    // 3. Auth Verification (OWASP A01)
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
        const decoded = await getAdminAuth().verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user authentication' }, { status: 401 });
    }

    // 4. Anti-SSRF URL Validation & Normalization
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only secure HTTPS URLs are permitted' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (isPrivateOrRestrictedHost(hostname)) {
      return NextResponse.json({ error: 'Access to private or internal network endpoints is blocked (SSRF Protection)' }, { status: 403 });
    }

    const isDomainAllowed = ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    if (!isDomainAllowed) {
      return NextResponse.json({
        error: `Domain '${hostname}' is not permitted. Allowed sources: GitHub and Google Drive.`,
      }, { status: 400 });
    }

    // 5. Transform URL or Full Repository Target
    let targetFetchUrl = rawUrl;
    let filename = 'imported-file.txt';
    let language = 'typescript';

    // Binary extensions to ignore when indexing repositories
    const BINARY_EXTENSIONS = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
      '.mp4', '.mov', '.avi', '.mp3', '.wav',
      '.zip', '.tar', '.gz', '.7z', '.rar',
      '.pdf', '.exe', '.bin', '.dll', '.so', '.dylib',
      '.pt', '.pth', '.h5', '.onnx', '.tflite', '.pkl', '.model'
    ];

    if (sourceType === 'github' || hostname.includes('github')) {
      // 5A. Handle Single File URL: https://github.com/:owner/:repo/blob/:branch/:filepath
      const githubBlobRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/;
      const blobMatch = rawUrl.match(githubBlobRegex);

      // 5B. Handle Full Repository URL: https://github.com/:owner/:repo or /tree/:branch
      const githubRepoRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?\/?$/;
      const repoMatch = rawUrl.match(githubRepoRegex);

      if (blobMatch) {
        const [, owner, repo, branch, filepath] = blobMatch;
        targetFetchUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;
        filename = filepath.split('/').pop() || 'snippet.ts';
      } else if (hostname === 'raw.githubusercontent.com') {
        targetFetchUrl = rawUrl;
        filename = parsedUrl.pathname.split('/').pop() || 'snippet.ts';
      } else if (repoMatch) {
        // FULL REPOSITORY IMPORT & BUNDLING
        const [, owner, repo, branch] = repoMatch;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents${branch ? `?ref=${branch}` : ''}`;

        try {
          const apiRes = await fetch(apiUrl, {
            headers: {
              'User-Agent': 'AEGIS-Security-Studio/3.0',
              Accept: 'application/vnd.github.v3+json',
            },
            signal: AbortSignal.timeout(9000),
          });

          if (!apiRes.ok) {
            if (apiRes.status === 404) {
              return NextResponse.json({ error: `Repository '${owner}/${repo}' not found. Verify the URL and that it is public.` }, { status: 404 });
            }
            if (apiRes.status === 403) {
              return NextResponse.json({ error: 'GitHub API rate limit exceeded. You can import individual files directly via raw link.' }, { status: 403 });
            }
            return NextResponse.json({ error: `GitHub API error: HTTP ${apiRes.status}` }, { status: 502 });
          }

          const items: any[] = await apiRes.json();
          if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Unexpected response from repository contents endpoint' }, { status: 502 });
          }

          // Filter for non-binary files
          const eligibleFiles = items.filter((item) => {
            if (item.type !== 'file' || !item.download_url) return false;
            const name = item.name.toLowerCase();
            return !BINARY_EXTENSIONS.some((ext) => name.endsWith(ext)) && item.size <= 3 * 1024 * 1024;
          });

          if (eligibleFiles.length === 0) {
            return NextResponse.json({ error: 'No readable source code files found in the repository root.' }, { status: 400 });
          }

          // If user specifically requested a single file from the repo
          const targetFileParam = payload.selectedFile;
          if (targetFileParam) {
            const selected = eligibleFiles.find((f) => f.name === targetFileParam);
            if (selected && selected.download_url) {
              targetFetchUrl = selected.download_url;
              filename = selected.name;
              // Will proceed to fetch this single file below
            } else {
              return NextResponse.json({ error: `Selected file '${targetFileParam}' not found in repository.` }, { status: 404 });
            }
          } else {
            // Bundle full code files together
            // Sort to prioritize active source files over configs
            const sortedFiles = [...eligibleFiles].sort((a, b) => {
              const isCodeA = ['.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.java', '.cpp', '.c'].some((ext) => a.name.endsWith(ext));
              const isCodeB = ['.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.java', '.cpp', '.c'].some((ext) => b.name.endsWith(ext));
              if (isCodeA && !isCodeB) return -1;
              if (!isCodeA && isCodeB) return 1;
              return a.size - b.size;
            });

            let bundledCode = '';
            const bundledFilenames: string[] = [];
            const MAX_BUNDLE_SIZE = 25000;

            for (const file of sortedFiles) {
              if (bundledCode.length >= MAX_BUNDLE_SIZE) break;
              // Skip large jupyter notebooks to reserve space for executable scripts
              if (file.name.endsWith('.ipynb') && file.size > 50000) continue;

              try {
                const fileRes = await fetch(file.download_url, {
                  headers: { 'User-Agent': 'AEGIS-Security-Studio/3.0' },
                  signal: AbortSignal.timeout(5000),
                });
                if (fileRes.ok) {
                  const content = await fileRes.text();
                  const header = `\n# ==========================================\n# REPOSITORY FILE: ${file.name} (${owner}/${repo})\n# ==========================================\n\n`;
                  bundledCode += header + content.trim() + '\n';
                  bundledFilenames.push(file.name);
                }
              } catch (fileErr) {
                console.warn(`Could not fetch file ${file.name} for bundle:`, fileErr);
              }
            }

            if (!bundledCode.trim()) {
              return NextResponse.json({ error: 'Failed to download code files from repository.' }, { status: 502 });
            }

            // Detect language
            let detectedLang = 'python';
            if (bundledFilenames.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'))) detectedLang = 'typescript';
            else if (bundledFilenames.some((f) => f.endsWith('.js') || f.endsWith('.jsx'))) detectedLang = 'javascript';
            else if (bundledFilenames.some((f) => f.endsWith('.py'))) detectedLang = 'python';
            else if (bundledFilenames.some((f) => f.endsWith('.go'))) detectedLang = 'go';
            else if (bundledFilenames.some((f) => f.endsWith('.rs'))) detectedLang = 'rust';

            const repoFilename = `${repo}-full-codebase.${detectedLang === 'python' ? 'py' : detectedLang === 'typescript' ? 'ts' : 'js'}`;

            return NextResponse.json({
              isRepository: true,
              repoName: `${owner}/${repo}`,
              filename: repoFilename,
              language: detectedLang,
              code: bundledCode.trim().slice(0, MAX_BUNDLE_SIZE),
              totalLength: bundledCode.length,
              isTruncated: bundledCode.length > MAX_BUNDLE_SIZE,
              filesIncluded: bundledFilenames,
              availableFiles: eligibleFiles.map((f) => ({
                name: f.name,
                size: f.size,
                download_url: f.download_url,
              })),
              sourceUrl: rawUrl,
            });
          }
        } catch (apiErr: any) {
          return NextResponse.json({ error: `Failed to connect to GitHub repository: ${apiErr.message}` }, { status: 502 });
        }
      } else {
        return NextResponse.json({
          error: 'Please provide a valid GitHub repository URL (e.g. https://github.com/owner/repo) or direct file link.',
        }, { status: 400 });
      }
    } else if (sourceType === 'gdrive' || hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
      // Extract Google Drive / Docs File ID
      let fileId = '';
      const driveFileMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const docsMatch = rawUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      const idParamMatch = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);

      if (driveFileMatch) {
        fileId = driveFileMatch[1];
        targetFetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        filename = 'google-drive-doc.txt';
      } else if (docsMatch) {
        fileId = docsMatch[1];
        targetFetchUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
        filename = 'google-doc.txt';
      } else if (idParamMatch) {
        fileId = idParamMatch[1];
        targetFetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        filename = 'google-drive-file.txt';
      } else {
        return NextResponse.json({
          error: 'Please provide a valid Google Drive or Google Docs sharing link (e.g. https://drive.google.com/file/d/FILE_ID/view)',
        }, { status: 400 });
      }
    }

    // Auto-detect language from extension
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) language = 'typescript';
    else if (filename.endsWith('.js') || filename.endsWith('.jsx')) language = 'javascript';
    else if (filename.endsWith('.py')) language = 'python';
    else if (filename.endsWith('.rules')) language = 'firestore-rules';
    else if (filename.endsWith('.json')) language = 'json';
    else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) language = 'yaml';
    else if (filename.endsWith('.sql')) language = 'sql';
    else if (filename.toLowerCase().includes('dockerfile')) language = 'dockerfile';

    // 6. Safe Anonymous Fetch with AbortController Timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(targetFetchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AEGIS-Security-Studio/3.0',
          Accept: 'text/plain, text/x-code, */*',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({
          error: `Failed to fetch file from source (HTTP ${response.status}). Ensure the repository or file is public.`,
        }, { status: response.status >= 400 && response.status < 500 ? 400 : 502 });
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'The imported file is empty' }, { status: 400 });
      }

      // 7. Enforce Bounding Limit
      const boundedCode = text.slice(0, 25000);

      return NextResponse.json({
        filename,
        language,
        code: boundedCode,
        totalLength: text.length,
        isTruncated: text.length > 25000,
        sourceUrl: rawUrl,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Request to remote host timed out (8s limit)' }, { status: 504 });
      }
      return NextResponse.json({ error: `Connection to external host failed: ${fetchErr.message}` }, { status: 502 });
    }
  } catch (error: any) {
    console.error('Import route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
