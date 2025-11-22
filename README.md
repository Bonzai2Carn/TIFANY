# TIFANY

TIFANY is a small single-page web application composed of HTML, CSS, and JavaScript. The repository contains the UI, styles, and client-side logic for the project. It is intended to be run as a static web app (open the HTML file in a browser or serve the folder from any static file server).

## Features

- Lightweight, dependency-free front-end implementation
- Single-file HTML entrypoint with separate CSS and JS
- Easy to run locally or deploy to any static hosting service

## File structure

tifany/
├── src/
│   ├── js/
│   │   ├── core/
│   │   │   └── tifany.js          # Main initialization
│   │   │   
│   │   ├── features/
│   │   │   ├── applyClassID.js
│   │   │   ├── dragDrop.js
│   │   │   ├── generateFunctions.js
│   │   │   ├── parseInputs.js
|   |   |   ├── tableManipulation.js   
│   │   │   └── tifanyTabs.js
│   │   ├── components/
│   │   │   ├── tableHistory.js
│   │   │   └── visualGridMapper.js
│   │   └── tifany.js                  # Main entry point
│   ├── css/
│   │   ├── tifanyUI.css
│   │   └── tifany.css                 # Main stylesheet
│   └── tifany.html                        # Bundle entry
├── dist/                               # Built files (generated)
├── examples/
│   ├── basic.html
│   ├── advanced.html
│   └── cdn-usage.html
├── docs/
│   └── API.md
├── tests/
├── package.json
├── webpack.config.js
├── .gitignore
├── README.md
└── LICENSE

## Getting started

Requirements
- A modern web browser (Chrome, Firefox, Edge, Safari)
- Optional: a simple static file server for development (live-server, http-server, Python's http.server, etc.)

Run locally
1. Open `tifany.html` directly in your browser (double-click the file), or
2. Serve the project folder from a static server and open the served URL in your browser. Example using Python 3 from the project folder:

   python -m http.server 8000

Then open http://localhost:8000/tifany.html

Development
- Edit `tifany.html`, `tifany.css`, and `tifany.js` as needed.
- If you use a development server with live reload, changes will be visible immediately in the browser.

Contributing
- Contributions are welcome. Please open issues or pull requests with clear descriptions of changes.

License

This project is licensed under the MIT License.

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.