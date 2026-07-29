import { withRoute } from '@/server/http/route';
import { getVideo } from '@/server/container';
import { videoError } from '@/server/video/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The body is a video stream, not JSON — Next must not try to buffer or cache it.
export const fetchCache = 'force-no-store';

/**
 * Upload one exercise demo video.
 *
 * Unlike the image endpoints (which hand out a presigned PUT so bytes bypass the
 * API), the video has to pass *through* the server: it is transcoded before it is
 * stored. The body is therefore the raw file, streamed straight to a temp file —
 * `req.formData()` would buffer the whole upload into the heap, which is exactly
 * what a 100 MB limit is meant to prevent.
 *
 *   POST /api/coach/exercises/video-upload?filename=squat.mp4
 *   Content-Type: video/mp4
 *   <raw bytes>
 *
 * The handler stays thin on purpose: parse the descriptor, delegate, return.
 * Validation, streaming, compression and cleanup all live in `VideoService`.
 */
export const POST = withRoute(
  async ({ req, user }) => {
    if (!req.body) throw videoError('VIDEO_EMPTY');

    const contentLength = req.headers.get('content-length');
    return getVideo().ingest(
      req.body,
      {
        contentType: req.headers.get('content-type'),
        filename: new URL(req.url).searchParams.get('filename'),
        declaredBytes: contentLength ? Number(contentLength) : null,
      },
      user.id,
    );
  },
  { role: 'COACH', requiresSub: true },
);
