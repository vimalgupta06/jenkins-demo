# Jenkins calculator practical demo

Based on [your tutor's repository](https://github.com/adityatandon15/jenkins-node-demo/tree/551518fa33cf6db12d246bf2d3641914e93ddc53).
This project follows its Express + Jest + esbuild stack and Linux process deployment.
A small browser calculator and additional API tests have been added.

## 1. Run the calculator locally

Use Node.js 22.13+ (the Jenkins setup below uses Node 26):

```bash
npm ci
npm run lint
npm run test:ci
npm run build
npm start
```

Open http://localhost:3000, enter two numbers, and click Add or Multiply.
Stop with Ctrl+C. `npm run dev` runs the source directly during development.

Try the API directly:

```bash
curl 'http://localhost:3000/api/add?a=20&b=22'
curl 'http://localhost:3000/api/multiply?a=6&b=7'
curl 'http://localhost:3000/health'
```

The first two return `{"result":42}`. Health returns status `UP`, the service
name, and version `dev` locally or the Jenkins build number after deployment.

## 2. What each file does

| File | Purpose |
| --- | --- |
| `src/math.js` | Addition, subtraction, multiplication, discount functions |
| `src/app.js` | Calculator page, addition/multiplication APIs, health endpoint |
| `src/server.js` | Starts Express on `PORT` or 3000 |
| `tests/math.test.js` | Tests calculation logic |
| `tests/app.test.js` | Tests actual HTTP responses and input validation |
| `eslint.config.js` | ESLint rules for Node and Jest |
| `package.json` | npm commands and dependencies |
| `package-lock.json` | Reproducible dependency versions from the reference repo |
| `Jenkinsfile` | Checkout, quality checks, packaging, deployment, smoke test |

`node_modules`, `dist`, `coverage`, and `reports` are generated; do not commit them.
Subtraction and discount are unit-tested helper functions as in the tutor's
project; the calculator exposes addition and multiplication.

## 3. One-time Jenkins setup

### Agent and plugins

Use a persistent Linux machine/agent with Git, curl, tar, and npm registry access.
Install Jenkins plugins **Pipeline**, **Git**, **NodeJS**, **JUnit**, and
**Timestamper**. For a GitHub Branch Source setup, also install **GitHub Branch Source**.

Under **Manage Jenkins → Tools → NodeJS installations**:

- Name: **NodeJS-26** (must exactly match the Jenkinsfile).
- Enable automatic installation and select a Node.js 26 release.

`tools { nodejs 'NodeJS-26' }` selects this configured tool and puts Node/npm on
PATH. It does not declare an npm package.

The pipeline retains your tutor's `agent any`. For this demo, make only one
persistent Linux agent eligible, or replace it with a label selecting your
chosen deployment machine. With several eligible agents, later builds could
deploy to a different machine. The app runs on the agent, not automatically
on the Jenkins controller or a separate cloud server.

### Deployment directory

Once, an administrator runs these commands **on the agent machine**:

```bash
sudo mkdir -p /opt/cicd-demo/node/releases
sudo chown -R jenkins:jenkins /opt/cicd-demo/node
```

Replace `jenkins:jenkins` with the actual agent OS user and group if different.
This ownership change is limited to the demo directory. The pipeline itself
runs without sudo. Reserve port 3000 and this deployment directory for one job.

### Create a Multibranch Pipeline

1. Push this `jenkins-demo` directory as the root of your own Git repository.
   Your local folder is already a Git repo with origin pointing to
   `https://github.com/vimalgupta06/jenkins-demo.git`.
2. Use `master` as the deployment branch, matching your tutor. If your default
   branch is `main`, change **both** `branch 'master'` conditions to `branch 'main'`.
3. In Jenkins choose **New Item → Multibranch Pipeline**.
4. Under **Branch Sources**, add Git with your repository URL and credentials
   if required. A GitHub source is another option with its plugin installed.
5. Set **Build Configuration → Script Path** to `Jenkinsfile`.
6. Under **Scan Multibranch Pipeline Triggers**, enable periodic scanning
   (for example every minute) so new branches are discovered too.
7. Save, run **Scan Multibranch Pipeline Now**, and let the first branch build
   run. If needed, open the `master` child job and click **Build Now** once.
8. Open `http://<agent-host>:3000`. Permit access to this port if the agent is remote.

**Why Multibranch?** `when { branch 'master' }` works with Multibranch Pipeline
branch metadata. In a regular Pipeline job, it can skip deployment even if Git
checked out master. See [Jenkins when/branch documentation](https://www.jenkins.io/doc/book/pipeline/syntax/#when).

The Jenkinsfile assumes `package.json` is at the repository root, exactly like
your tutor's repo. If you instead push the parent folder, change the script path
and wrap app commands, reports, and artifact paths in the corresponding directory.

## 4. How automation works

```text
Edit code → commit → push
                     ↓
Jenkins detects a Git change (polling every minute after the first build)
                     ↓
Checkout → Install Dependencies → Lint → Tests → Build → Package
                                                         ↓
                                         master only: Deploy → Smoke Test
```

A push to an already discovered feature branch runs the checks and packaging,
but skips deployment. A merge into master triggers the master build and deployment.
Polling builds only when Git changes; it does not redeploy every minute.
Periodic multibranch scanning discovers new branches. A publicly reachable
GitHub webhook can replace polling later; it is unnecessary for this local demo.
Your tutor's original Jenkinsfile does not declare a trigger, so its automatic
execution depends on job-level webhook/scanning configuration.

## 5. Understand the Jenkinsfile

| Section/stage | What happens |
| --- | --- |
| `agent any` | Allocates an available Jenkins executor and workspace |
| `tools` | Selects configured NodeJS-26 |
| `skipDefaultCheckout(true)` | Makes checkout explicit in the next stage |
| `timestamps()` | Adds times to console logs |
| `disableConcurrentBuilds()` | Prevents overlapping builds of the same branch job |
| `skipStagesAfterUnstable()` | Prevents deployment after an unstable test result |
| Checkout | `checkout scm` downloads the branch's code |
| Install Dependencies | `npm ci` installs exact locked dependencies, including dev tools |
| Lint | ESLint catches code issues |
| Tests | Jest runs tests and coverage; jest-junit writes `reports/junit/junit.xml` |
| Tests `post/always` | Publishes results in Jenkins even if a test fails |
| Build | esbuild bundles local source into `dist/server.js`; Express stays external |
| Package | tar packages dist and package manifests; Jenkins archives the artifact |
| Deploy | Runs only for master; extracts and starts a versioned release |
| Smoke Test | Checks health and that the running version equals this build number |

`npm run test:ci` must exist in package.json, and its report path must match
`junit testResults`. This project now has both, as in your tutor's setup.

### Deploy stage, step by step

For build 12:

```text
/opt/cicd-demo/node/
├── releases/
│   ├── 11/
│   └── 12/          # extracted dist + package manifests + runtime dependencies
├── current -> /opt/cicd-demo/node/releases/12
├── app.pid         # process ID of the new app
└── app.log         # stdout/stderr of the current launch
```

1. Create a new release directory and extract the archived tar file.
2. Run `npm ci --omit=dev` there: install Express but omit Jest/esbuild/ESLint.
3. Read the previous PID and stop that app if it is running.
4. Update the `current` symbolic link to the new release.
5. Start `node dist/server.js` using nohup in the background.
6. Save its PID, then check `/health` for the new version.

`APP_VERSION` becomes the build number visible on the page and health response.
`PORT=3000` chooses the listening port. `nohup` ignores terminal hangup, `&`
runs in the background, and redirected streams detach it from the build console.
`JENKINS_NODE_COOKIE=dontKillMe` keeps Jenkins' Pipeline process cleanup from
matching this child process. See [Jenkins process cleanup](https://www.jenkins.io/doc/book/managing/spawning-processes/).

Small improvements over the pasted pipeline: automatic polling, stop on unstable
results, no deletion of an existing release directory, redirected stdin, health
retries with build-version validation, and an accurate failure message.
An existing release directory now causes a safe failure rather than overwriting it;
use a new build instead of restarting the Deploy stage for the same build number.

## 6. Practice the workflow

1. Change the calculator heading in `src/app.js` (keep `Jenkins Calculator` in
   the heading, or update the matching test).
2. Run `npm run lint && npm run test:ci && npm run build` locally.
3. Commit and push to your configured branch.
4. Watch Jenkins Console Output, test results, and archived tar artifact.
5. On master, refresh the calculator: the deployed build number changes.
6. To demonstrate a blocked release, temporarily make `multiply` return `a + b`,
   commit and push. The tests fail and deployment is skipped. Fix it and push again.

## 7. Limits and troubleshooting

This is your tutor's single-host learning deployment. Replacing the process has
brief downtime. It does not roll back automatically, restart a crashed app, or
start the app after a machine reboot; a service manager such as systemd is the
next lesson. A smoke-test failure occurs after deployment, so it does not mean
the previous release is still running. Release folders accumulate until cleaned up.

- **Unknown nodejs tool/type:** install NodeJS plugin and configure the exact name.
- **Deploy skipped:** check Multibranch job type and master/main spelling.
- **Permission denied in /opt:** fix ownership for the actual agent OS user once.
- **Missing report:** inspect npm test:ci output and the configured JUnit path.
- **Address already in use:** check which process owns port 3000; inspect app.log.
- **Build succeeds but app is elsewhere:** check the agent selected by `agent any`.
- **No automatic build:** inspect branch scanning and the child job's Git Polling Log.

Jenkins configuration and `/opt` deployment need to be performed on your actual
Jenkins machine; creating these project files alone does not provision Jenkins.
