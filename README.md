# Public JS for our external websites

This project includes TypeScript scripts that are included as `<script>` tags on our external websites. Each website has its own js entrypoint (e.g., `webflow.js` or `clickfunnels.js`).

GitHub actions handles building and committing new versions of code that are ready for distribution. Every commit to main results in a GH action run that will attempt to build new code and assign it a new version.

The final compiled code is hosted and served using [jsdelivr](https://www.jsdelivr.com/documentation#id-github).

## Getting Started

1. Clone the repository and install dependencies:
    ```bash
   git clone https://github.com/xip-tech/public-js.git
   cd public-js
   yarn install
   yarn test
   ```
2. Set up your IDE to respect our ESLint/prettier config (code that fails `yarn lint` will fail to build on GitHub).

## Development Workflow

1. Create a new branch for your feature or fix:
    ```bash
    git checkout -b my-branch
    ```

2. Make your changes and add tests.

3. Run tests locally to make sure everything works:
    ```bash
   yarn lint
   yarn test
    ```

4. Commit your changes:
    ```bash
    git add .
    git commit -m "Add my new feature"
    ```

5. Push your branch:
    ```bash
    git push origin my-branch
    ```

6. Open a PR against the `main` branch on GitHub.

## Creating a New Release
1. Make sure your PR has been reviewed and all tests are passing.
2. Merge your PR
3. Wait for GitHub actions to compile and tag a new version
4. Update the script tags in Webflow and/or ClickFunnels to use the new version:
    ```html
    <script src="https://cdn.jsdelivr.net/gh/xip-tech/public-js@[version]/dist/clickfunnels.js"></script>
    ```