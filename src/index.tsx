import React from 'react';
import ReactDOM from 'react-dom';
import { Terminal } from './comp/terminal/terminal';
import './style.scss';

ReactDOM.render(
    <React.StrictMode>
        <div className="content">
            <Terminal />
        </div>
    </React.StrictMode>,
    document.getElementById('root'),
    () => {
        console.log('%cDOM Rendered', 'color:lime');
    }
);
