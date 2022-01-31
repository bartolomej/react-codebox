// @ts-ignore
import React from 'react';
import { Meta, Story } from '@storybook/react';
import { CodeEditor, CodeEditorProps, defaultTheme } from '../src';

const meta: Meta = {
  title: 'Code Editor',
  component: CodeEditor,
  argTypes: {
    code: {
      control: {
        type: 'text',
      },
    },
    language: {
      options: ['javascript', 'html'],
    },
  },
  parameters: {
    controls: { expanded: true },
  },
};

export default meta;

const Template: Story<CodeEditorProps> = args => {
  return <CodeEditor {...args} />;
};

// By passing using the Args format for exported stories, you can control the props for a component for reuse in a test
// https://storybook.js.org/docs/react/workflows/unit-testing
export const Default = Template.bind({});

Default.args = {
  language: 'html',
  autorun: true,
  theme: defaultTheme,
  code: '<h1>Heading 1</h1>\n' +
    '<p>Paragraph</p>',
};
