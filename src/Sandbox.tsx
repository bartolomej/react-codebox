import React from "react";
import styled from "styled-components";

export type SandboxProps = {
  hidden?: boolean;
  language?: SandboxLanguage;
  autoReload?: boolean;
}

export type SandboxLanguage = "javascript" | "html";

type SandboxMessage = {
  type: "log";
  logLevel?: "log" | "info" | "warn" | "error";
  arguments: any[];
}

export class Sandbox extends React.Component<SandboxProps, {}, {}> {

  private iframe?: HTMLIFrameElement;

  constructor (props: SandboxProps) {
    super(props);
  }

  shouldComponentUpdate () {
    return true;
  }

  componentDidMount () {
    this.listenIframeEvents();
  }

  /**
   * Executes (renders) given html code in a sandbox environment.
   * @param code {string} - html document
   */
  execute(code: string) {
    if (this.iframe) {
      const {contentWindow} = this.iframe;
      this.iframe.onload = () => this.writeContent(code);
      if (contentWindow) {
        contentWindow.location.reload(); // clean JS context (clear declared variables,..)
      }
    } else {
      console.log(`[Sandbox] can't execute code, iframe not ready`)
    }
  }

  /**
   * Executes given JavaScript code in a sandbox environment and returns the result.
   * @param code {string} - js code to execute
   * @returns {any} - value of the result
   */
  eval(code: string) {
    if (this.iframe) {
      const {contentWindow} = this.iframe;
      // @ts-ignore
      return contentWindow.eval(code);
    } else {
      console.log(`[Sandbox] can't eval code, iframe not ready`)
    }
  }

  private listenIframeEvents () {
    window.addEventListener('message', (response) => {
      // Make sure message is from our iframe, extensions like React dev tools might use the same technique and mess up our logs
      if (response.data && response.data.source === 'iframe') {
        const payload = JSON.parse(response.data.message);
        switch (payload.type) {
          case "log":
            return Sandbox.handleLogMessage(payload);
        }
      }
    });
  }

  private static handleLogMessage (payload: SandboxMessage) {
    switch (payload.logLevel) {
      case "warn":
      case "error":
      case "info":
      case "log": {
        // TODO: handle logs
        console.log("log: ", payload.arguments)
      }
    }
  }

  writeContent(value: string) {
    const {language} = this.props;

    if (this.iframe && this.iframe.contentDocument) {
      const {contentDocument} = this.iframe;
      contentDocument.open();
      contentDocument.write(this.internalScripts());
      contentDocument.write(this.formatContent(value, language));
      contentDocument.close();
    }
  }

  formatContent (value: string, language?: SandboxLanguage) {
    switch (language) {
      case "javascript":
        return `<script>${value}</script>`
      default:
        return value;
    }
  }

  internalScripts () {
    return `
      <script>
        // Save the current console log function in case we need it.
        const overwrites = Object.create({
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info,
        });

        function emitMessage(data) {
          window.parent.postMessage(
            {
              source: 'iframe',
              message: JSON.stringify(data),
            },
            '*'
          );
        }

        function emitLog(logLevel) {
          return function (...rest) {
            // window.parent is the parent frame that made this window
            emitMessage({
              type: "log",
              logLevel,
              arguments: rest
            })
            // Finally, applying the console statements to saved instance earlier
            overwrites[logLevel].apply(console, arguments);
          };
        }

        // Override the console
        console.log = emitLog("log");
        console.error = emitLog("error");
        console.warn = emitLog("warn");
        console.info = emitLog("info");
      </script>
    `
  }

  render() {
    const {hidden} = this.props;
    // must prevent rerender of iframe
    // https://reactjs.org/docs/integrating-with-other-libraries.html#integrating-with-dom-manipulation-plugins
    return (
      <Iframe hidden={hidden === undefined ? false : hidden} ref={(el: HTMLIFrameElement) => this.iframe = el} />
    )
  }
}

type IframeProps = {
  readonly hidden: boolean;
}

const Iframe = styled.iframe<IframeProps>`
  height: 100%;
  width: 100%;
  overflow: scroll;
  border: none;
  background: white;
  ${(props) => props.hidden ? 'display: none' : ''}
`;
