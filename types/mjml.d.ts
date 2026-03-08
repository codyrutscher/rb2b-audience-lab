declare module "mjml" {
  interface MjmlError {
    message: string;
    tagName?: string;
    formattedMessage?: string;
  }

  interface Mjml2HtmlOutput {
    html: string;
    errors: MjmlError[];
  }

  interface Mjml2HtmlOptions {
    fonts?: Record<string, string>;
    keepComments?: boolean;
    beautify?: boolean;
    minify?: boolean;
    validationLevel?: "strict" | "soft" | "skip";
  }

  function mjml2html(mjml: string, options?: Mjml2HtmlOptions): Mjml2HtmlOutput;

  export = mjml2html;
}
