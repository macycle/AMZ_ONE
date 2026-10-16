declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    LINGXING_API_BASE_URL?: string;
    LINGXING_APP_KEY?: string;
    LINGXING_APP_SECRET?: string;
  }
}
