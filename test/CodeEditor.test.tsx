import React from 'react';
import * as ReactDOM from 'react-dom';
import { CodeEditor } from '../src';

describe('CodeEditor', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<CodeEditor />, div);
  });
});
