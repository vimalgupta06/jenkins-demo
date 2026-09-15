pipeline {
    // Assign this label to one persistent Linux agent with Node 22+, npm and Docker.
    agent { label 'node-docker-demo' }
    options {
        disableConcurrentBuilds()
        timeout(time: 10, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    // Checks Git every minute; builds only when the configured branch changes.
    triggers { pollSCM('* * * * *') }
    environment {
        APP_NAME = 'jenkins-node-demo'
        APP_PORT = '3000'
    }
    stages {
        stage('Locate app') {
            steps {
                script {
                    // Supports either this folder at repo root or the parent repo.
                    env.APP_DIR = fileExists('jenkins-demo/package.json') ? 'jenkins-demo' : '.'
                }
            }
        }
        stage('Install') {
            steps { dir(env.APP_DIR) { sh 'node --version && npm ci' } }
        }
        stage('Lint') {
            steps { dir(env.APP_DIR) { sh 'npm run lint' } }
        }
        stage('Test') {
            steps { dir(env.APP_DIR) { sh 'npm test' } }
        }
        stage('Build') {
            steps { dir(env.APP_DIR) { sh 'npm run build' } }
        }
        stage('Package') {
            steps { dir(env.APP_DIR) { sh 'docker build -t "$APP_NAME:$BUILD_NUMBER" .' } }
        }
        stage('Deploy') {
            steps {
                dir(env.APP_DIR) {
                    sh '''
                        set -eu
                        if docker container inspect "$APP_NAME" >/dev/null 2>&1; then
                            docker rm -f "$APP_NAME"
                        fi
                        docker run -d --name "$APP_NAME" --restart unless-stopped \
                            -p "$APP_PORT:3000" "$APP_NAME:$BUILD_NUMBER"
                    '''
                }
            }
        }
        stage('Verify deployment') {
            steps {
                sh '''
                    set -eu
                    for attempt in $(seq 1 30); do
                        status=$(docker inspect --format '{{.State.Health.Status}}' "$APP_NAME")
                        if [ "$status" = healthy ]; then
                            echo "Deployment healthy on agent port $APP_PORT"
                            exit 0
                        fi
                        sleep 2
                    done
                    docker logs --tail 50 "$APP_NAME"
                    exit 1
                '''
            }
        }
    }
    post {
        success { echo 'App deployed successfully. Open http://<agent-host>:3000' }
        failure { echo 'Pipeline failed. Inspect the first red stage in Console Output.' }
    }
}
