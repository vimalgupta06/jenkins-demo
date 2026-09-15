pipeline {

    agent any

    tools {
        nodejs 'NodeJS-26'
    }

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
        skipStagesAfterUnstable()
    }

    // After the first build, detect pushes without clicking Build Now.
    triggers { pollSCM('* * * * *') }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Tests') {
            steps {
                sh 'npm run test:ci'
            }

            post {
                always {
                    junit testResults: 'reports/junit/junit.xml'
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Package') {
            steps {
                sh '''
                    tar -czf node-demo-${BUILD_NUMBER}.tar.gz \
                        dist package.json package-lock.json
                '''

                archiveArtifacts artifacts: "node-demo-${BUILD_NUMBER}.tar.gz"
            }
        }

        stage('Deploy') {

            when {
                branch 'master'
            }

            steps {

                sh '''
                    set -e

                    DEPLOY_ROOT=/opt/cicd-demo/node
                    RELEASE_DIR="$DEPLOY_ROOT/releases/$BUILD_NUMBER"

                    echo "Deploying build $BUILD_NUMBER"
                    echo "Release directory: $RELEASE_DIR"

                    mkdir -p "$DEPLOY_ROOT/releases"
                    mkdir "$RELEASE_DIR"

                    ARTIFACT="node-demo-${BUILD_NUMBER}.tar.gz"

                    tar -xzf "$ARTIFACT" -C "$RELEASE_DIR"

                    cd "$RELEASE_DIR"

                    npm ci --omit=dev

                    if [ -f "$DEPLOY_ROOT/app.pid" ]; then

                        OLD_PID=$(cat "$DEPLOY_ROOT/app.pid" || true)

                        if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then

                            echo "Stopping old application: $OLD_PID"

                            kill "$OLD_PID" || true

                            sleep 2
                        fi
                    fi

                    ln -sfn "$RELEASE_DIR" "$DEPLOY_ROOT/current"

                    echo "Starting new application"

                    JENKINS_NODE_COOKIE=dontKillMe \
                    APP_VERSION="$BUILD_NUMBER" \
                    PORT=3000 \
                    nohup node dist/server.js \
                    > "$DEPLOY_ROOT/app.log" 2>&1 < /dev/null &

                    echo $! > "$DEPLOY_ROOT/app.pid"

                    echo "Application PID:"
                    cat "$DEPLOY_ROOT/app.pid"
                '''
            }
        }

        stage('Smoke Test') {

            when {
                branch 'master'
            }

            steps {
                sh '''
                    set -e
                    for attempt in $(seq 1 15); do
                        if curl -fsS --max-time 2 http://127.0.0.1:3000/health | node -e '
                            let body = "";
                            process.stdin.on("data", chunk => body += chunk);
                            process.stdin.on("end", () => {
                                try {
                                    const health = JSON.parse(body);
                                    process.exit(health.status === "UP" && health.version === process.env.BUILD_NUMBER ? 0 : 1);
                                } catch { process.exit(1); }
                            });
                        '; then
                            echo "New release is healthy"
                            exit 0
                        fi
                        sleep 2
                    done
                    echo "New release did not become healthy"
                    exit 1
                '''
            }
        }
    }

    post {

        success {
            echo 'PIPELINE SUCCESSFUL'
        }

        failure {
            echo 'PIPELINE FAILED - inspect the failed stage; deployment may have already started'
        }
    }
}
