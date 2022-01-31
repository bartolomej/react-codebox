import React, { useState, useEffect, useRef, FC } from "react";
import AceEditor from "react-ace";
import styled from 'styled-components'
import {
  AiOutlineFullscreen,
  AiOutlineFullscreenExit,
} from "react-icons/ai";
import { IoPlayOutline } from "react-icons/io5";

// ace common
import "ace-builds/src-noconflict/theme-xcode"
import "ace-builds/src-min-noconflict/ext-searchbox";
import "ace-builds/src-min-noconflict/ext-language_tools";

// ace language support
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-css"
import "ace-builds/src-noconflict/mode-html"

// ace language snippets
import "ace-builds/src-noconflict/snippets/html"
import "ace-builds/src-noconflict/snippets/css"
import "ace-builds/src-noconflict/snippets/javascript"

// prettier
import prettier from "prettier/standalone";
import parserHtml from "prettier/parser-html";
import { Sandbox, SandboxLanguage } from "./Sandbox";
import { CursorOptions } from "prettier";

export type CodeEditorProps = {
  open?: boolean;
  zIndex?: number;
  code: string;
  language?: SandboxLanguage;
  theme?: "xcode";
  height?: string;
  width?: string;
  fullscreen?: boolean;
  autorun?: boolean;
  websitePreview?: boolean;
  onToggle?: (open: boolean) => void;
}

const prettierOptions: CursorOptions = {
  cursorOffset: 0,
  parser: "html",
  plugins: [parserHtml]
}

// TODO: refactor theme logic
export const theme = {
  colors: {
    red: '#da2748',
    primary: '#E76F51',
    secondary: '#2A9D8F',
    dark: '#264653',
    lightDark: '#556d77',
    light: '#F1F2EB',
    white: '#FFFFFF',
    html: "#e96228",
    css: "#2862e9",
    js: "#f7e017"
  },
  constants: {
    smBorderRadius: '8px',
    containerWidth: '700px',
  },
  gutter: {
    sm: '5px',
    med: '10px',
  },
  styles: {
    boxShadow: (focused: boolean) => `-1px 1px ${focused ? '50px' : '30px'} -10px rgb(0 0 0 / 30%), 0 18px 36px -18px rgb(0 0 0 / 33%)`
  }
}

const CodeEditor: FC<CodeEditorProps> = ({
  open = true,
  zIndex = 100,
  onToggle = () => null,
  code = '',
  language = 'html',
  theme = 'xcode',
  height = '500px',
  width = '100%',
  fullscreen = false,
  autorun = false,
  websitePreview = true
}) => {
  const [value, setValue] = useState(code);
  const [isFocused, setFocused] = useState(false);
  const [isFullscreen, setFullscreen] = useState(fullscreen);
  const [syntaxError, setSyntaxError] = useState<null|Error>(null);
  const sandboxRef = useRef<Sandbox|null>();

  useEffect(() => {
    setValue(code);
  }, [code])

  useEffect(() => {
    if (sandboxRef.current && autorun) {
      updateIframeContent();
    }
    const formatted = formatCode(value);
    if (formatted !== value) {
      // TODO: don't update value with formatted code until cursor offset is not set
      setValue(value);
    }
  }, [value])

  useEffect(() => {
    setFullscreen(fullscreen);
  }, [fullscreen])

  useEffect(() => {
    if (!syntaxError && autorun) {
      updateIframeContent()
    }
  }, [syntaxError])

  useEffect(() => {
    window.addEventListener("keydown", onKeyPress);
    return () => window.removeEventListener("keydown", onKeyPress)
  }, [])

  function formatCode (code: string) {
    // execute formatting in worker if needed
    // https://github.com/prettier/prettier/blob/main/website/playground/WorkerApi.js
    try {
      // TODO: why does prettier not detect or format js or css code ?
      // TODO: move cursor after formatting
      const {
        formatted,
      } = prettier.formatWithCursor(code, prettierOptions)
      // reset error when code contains no syntax errors
      setSyntaxError(null);
      return formatted;
    } catch (e) {
      // TODO: highlight line directly in ace code editor ?
      // TODO: use e.loc properties to extract info about error location
      setSyntaxError(e as Error);
      return code;
    }
  }

  function renderCodeFrame () {
    const codeLineRegex = /[ ]+[0-9]+ \|/;
    const errorLineRegex = />[ ]+[0-9]+/;
    const errorPointerLineRegex = /[ ]+\|[ ]+[^]+[.]*/;
    return syntaxError && syntaxError.message.split("\n").map((line, i) => {
      // check if syntax error is on current line
      if (errorLineRegex.test(line)) {
        return <MarkedCodeFrameLine key={i}>{line}</MarkedCodeFrameLine>
      }
      if (codeLineRegex.test(line)) {
        return <CodeFrameLine key={i}>{line}</CodeFrameLine>;
      }
      if (errorPointerLineRegex.test(line)) {
        return <PointerCodeFrameLine key={i}>{line}</PointerCodeFrameLine>
      }
      return <SyntaxErrorMessage key={i}>{line}</SyntaxErrorMessage>
    })
  }

  function onKeyPress (e: KeyboardEvent) {
    if (e.key === "Escape") {
      setFullscreen(false)
      if (open) {
        onToggle(false)
      }
    }
  }

  function updateIframeContent () {
    console.log(sandboxRef.current?.execute("Test"))
    sandboxRef.current?.execute(value);
  }

  const renderFullscreenToggle = () => isFullscreen ? (
    <ControlButton data-splitbee-event="CodeEditor small" onClick={() => {
      setFullscreen(false);
      onToggle(false)
    }}>
      <AiOutlineFullscreenExit size={15}/>
    </ControlButton>
  ) : (
    <ControlButton data-splitbee-event="CodeEditor fullscreen" onClick={() => {
      setFullscreen(true);
      onToggle(true)
    }}>
      <AiOutlineFullscreen size={15}/>
    </ControlButton>
  )

  const renderRunButton = () => !autorun && !syntaxError && (
    <ControlButton data-splitbee-event="CodeEditor run" onClick={() => {
      updateIframeContent()
    }}>
      <IoPlayOutline size={15}/>
    </ControlButton>
  )

  return (
    <OuterContainer zIndex={isFullscreen ? 1000 : zIndex} isOpen={open}
                    fullscreen={isFullscreen}>
      <Container focused={isFocused}
                 style={{ height: isFullscreen ? '100%' : height, width }}>
        <ControlsWrapper>
          {renderRunButton()}
          {renderFullscreenToggle()}
        </ControlsWrapper>
        <EditorSide>
          <AceEditor
            mode={language}
            theme={theme}
            fontSize={16}
            height="100%"
            width="unset"
            editorProps={{ $blockScrolling: true }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={setValue}
            value={value}
            showGutter={isFullscreen}
            setOptions={{
              useWorker: false,
              displayIndentGuides: true,
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              showLineNumbers: true,
              tabSize: 2
            }}
          />
        </EditorSide>
        {syntaxError ? (
          <PreviewSide>
            <SyntaxErrorWrapper>
              <SyntaxErrorTitle>POZOR NAPAKA V KODI!</SyntaxErrorTitle>
              <pre>{renderCodeFrame()}</pre>
            </SyntaxErrorWrapper>
          </PreviewSide>
        ) : (
          websitePreview ? (
            <PreviewSide>
              <Sandbox language={language} ref={el => sandboxRef.current = el} />
            </PreviewSide>
          ) : (
            <Sandbox hidden language={language} ref={el => sandboxRef.current = el}/>
          )
        )}
      </Container>
    </OuterContainer>
  )
}

type OuterContainerProps = {
  zIndex: number;
  isOpen: boolean;
  fullscreen: boolean;
}

const OuterContainer = styled.div<OuterContainerProps>`
  z-index: ${({ zIndex }) => zIndex};
  display: ${({ isOpen }) => isOpen ? `block` : 'none'};
  ${({ fullscreen }) => fullscreen ? `position: fixed; top: 0; bottom: 0; left: 0; right: 0;` : ''}
`;

type ContainerProps = {
  focused: boolean;
}

const Container = styled.div<ContainerProps>`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: row;
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  transition: 0.3s ease-in-out box-shadow;
  box-shadow: ${({ focused }) => theme.styles.boxShadow(focused)};
  border: 2px solid ${({}) => theme.colors.light}
`;

const ControlsWrapper = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: row;
`;

const ControlButton = styled.button`
  display: flex;
  background: white;
  padding: 3px;
  border: 2px solid ${({}) => theme.colors.light};
  border-radius: ${({}) => theme.constants.smBorderRadius};
  margin-left: ${({}) => theme.gutter.sm};
`;

const EditorSide = styled.div`
  flex: 1;
  resize: horizontal;
  border-right: 1px solid ${({}) => theme.colors.light};
`

const PreviewSide = styled.div`
  flex: 1;
  background: white;
  max-width: 50%;
`

const SyntaxErrorWrapper = styled.div`
  padding: 5px;
`;

const CodeFrameLine = styled.code`
  border: none;
  background: none;
  display: block;
  color: ${({}) => theme.colors.lightDark}
`;

const MarkedCodeFrameLine = styled(CodeFrameLine)`
  background: ${({}) => theme.colors.red};
  color: ${({}) => theme.colors.light};
`;

const PointerCodeFrameLine = styled(CodeFrameLine)`
  color: ${({}) => theme.colors.red};
`;

const SyntaxErrorTitle = styled.b`
  color: ${({}) => theme.colors.red};
  padding: 5px;
`;

const SyntaxErrorMessage = styled(CodeFrameLine)`
  white-space: normal;
  line-height: 1.4;
  margin-bottom: 5px;
`;

export default CodeEditor
