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

### Running the Dev Server

To simulate and test how the scripts will behave on the actual websites, you can run the provided development server. This is especially helpful when debugging and ensuring that the scripts load and function correctly.

1. Start the development server:
    ```bash
    yarn start
    ```

2. Navigate to `http://localhost:9000` in your browser. This will serve the files from the `dev-server-public` directory.

3. You may want to alter the HTML pages in `dev-server-public` to exercise any new behavior you've included in your changes.

### Ignoring `dist` changes locally
When working locally, the `dist` dir will end up with changes that should not be checked in. Unfortunately adding `dist` to `.gitignore` doesn't do much, because we need to keep these files checked in for our automated build process w/GitHub actions to work properly.

If you're annoyed by the clutter of seeing all of the changes to the `dist` dir when you run `git status`, you can tell your local git to ignore these changes:

```bash
git ls-files -z dist/ | xargs -0 git update-index --assume-unchanged
```
This will tell Git to ignore changes to the files in the dist directory only on your local machine, making your git status cleaner. When you're ready to track changes again, you can revert this with:

```bash
git ls-files -z dist/ | xargs -0 git update-index --no-assume-unchanged
```

## Creating a New Release
1. Make sure your PR has been reviewed and all tests are passing.
2. Merge your PR
3. Wait for GitHub actions to compile and tag a new version
4. Update the script tags in Webflow and/or ClickFunnels to use the new version:
    ```html
    <script src="https://cdn.jsdelivr.net/gh/xip-tech/public-js@[version]/dist/clickfunnels.js"></script>
    ```