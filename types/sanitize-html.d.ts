declare module "sanitize-html" {
  interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
  }
  function sanitizeHtml(html: string, options?: IOptions): string;
  export = sanitizeHtml;
}
