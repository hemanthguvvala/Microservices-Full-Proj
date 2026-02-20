// ============================================================================
// DECLARATIVE JENKINS PIPELINE — Full CI/CD for Employee Management Platform
// ============================================================================
// Demonstrates: Shared library structure, parallel stages, Docker agent,
// SonarQube, Nexus/Artifactory publish, JAR + WAR + Docker image builds,
// multi-cloud deployment, and post-build notifications.
//
// Interview: "I've implemented Jenkins declarative pipelines with parallel
// test stages, SonarQube quality gates, artifact publishing to Nexus,
// multi-stage Docker builds, and conditional deployments to AWS/Azure/GCP."
// ============================================================================

pipeline {
    agent any

    tools {
        maven 'Maven-3.9'
        jdk 'JDK-17'
        nodejs 'Node-20'
    }

    environment {
        // ── Service Configuration ──
        SERVICE_NAME    = 'employee-service'
        MAIN_MODULE     = 'employee-microservice'
        DOCKER_REGISTRY = credentials('docker-registry-url')    // ECR/ACR/GCR
        SONAR_TOKEN     = credentials('sonarqube-token')
        NEXUS_CREDS     = credentials('nexus-credentials')       // Nexus/Artifactory
        SLACK_CHANNEL   = '#deployments'

        // ── Versioning ──
        VERSION         = readMavenPom().getVersion()
        BUILD_TAG       = "${VERSION}-${BUILD_NUMBER}"
        GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        IMAGE_TAG       = "${BUILD_TAG}-${GIT_COMMIT_SHORT}"

        // ── Quality Gates ──
        COVERAGE_THRESHOLD = '70'
        SONAR_PROJECT_KEY  = 'employee-management-platform'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        ansiColor('xterm')
    }

    parameters {
        choice(
            name: 'DEPLOY_ENV',
            choices: ['none', 'dev', 'staging', 'production'],
            description: 'Target deployment environment'
        )
        choice(
            name: 'CLOUD_PROVIDER',
            choices: ['aws', 'azure', 'gcp'],
            description: 'Target cloud provider for deployment'
        )
        choice(
            name: 'PACKAGING',
            choices: ['jar', 'war'],
            description: 'Build artifact type — JAR (embedded Tomcat) or WAR (external Tomcat)'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip test execution (emergency hotfix only)'
        )
        booleanParam(
            name: 'SKIP_SONAR',
            defaultValue: false,
            description: 'Skip SonarQube analysis'
        )
    }

    stages {
        // ────────────────────────────────────────────────────────────────────
        // STAGE 1: Checkout & Validate
        // ────────────────────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    echo "Building ${SERVICE_NAME} v${BUILD_TAG} on branch ${env.BRANCH_NAME}"
                    echo "Packaging: ${params.PACKAGING.toUpperCase()}"
                    echo "Cloud target: ${params.CLOUD_PROVIDER}"
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 2: Build — JAR or WAR
        // Interview: "JAR packages embedded Tomcat (java -jar), WAR deploys
        //             to external Tomcat/WildFly. We support both via Maven
        //             profiles. JAR for containers, WAR for legacy infra."
        // ────────────────────────────────────────────────────────────────────
        stage('Build') {
            steps {
                dir(MAIN_MODULE) {
                    script {
                        def skipFlag = params.SKIP_TESTS ? '-DskipTests' : ''
                        def packagingProfile = params.PACKAGING == 'war' ? '-Pwar-packaging' : ''

                        sh """
                            mvn clean package ${skipFlag} ${packagingProfile} \
                                -Drevision=${BUILD_TAG} \
                                -B -ntp
                        """

                        // Archive the artifact
                        def artifactExt = params.PACKAGING
                        archiveArtifacts artifacts: "target/*.${artifactExt}", fingerprint: true
                    }
                }
            }
            post {
                success {
                    echo "Build artifact: ${params.PACKAGING.toUpperCase()} created successfully"
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 3: Parallel Testing
        // Interview: "Unit + integration + security tests run in parallel
        //             to cut pipeline time from 15 min to 7 min."
        // ────────────────────────────────────────────────────────────────────
        stage('Test') {
            when {
                expression { !params.SKIP_TESTS }
            }
            parallel {
                stage('Unit Tests') {
                    steps {
                        dir(MAIN_MODULE) {
                            sh 'mvn test -pl . -B -ntp'
                        }
                    }
                    post {
                        always {
                            junit "${MAIN_MODULE}/target/surefire-reports/*.xml"
                        }
                    }
                }

                stage('Integration Tests') {
                    steps {
                        dir(MAIN_MODULE) {
                            sh 'mvn verify -Pintegration-tests -B -ntp'
                        }
                    }
                    post {
                        always {
                            junit "${MAIN_MODULE}/target/failsafe-reports/*.xml"
                        }
                    }
                }

                stage('Frontend Tests') {
                    steps {
                        dir('frontend-react') {
                            sh 'npm ci'
                            sh 'npm run test:ci'
                            sh 'npm run lint'
                            sh 'npm run type-check'
                        }
                    }
                    post {
                        always {
                            junit 'frontend-react/junit-results.xml'
                        }
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 4: Code Coverage + Quality Gate
        // ────────────────────────────────────────────────────────────────────
        stage('Code Coverage') {
            when {
                expression { !params.SKIP_TESTS }
            }
            steps {
                dir(MAIN_MODULE) {
                    jacoco(
                        execPattern: '**/target/jacoco.exec',
                        classPattern: '**/target/classes',
                        sourcePattern: '**/src/main/java',
                        minimumLineCoverage: COVERAGE_THRESHOLD,
                        changeBuildStatus: true
                    )
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 5: SonarQube Analysis
        // Interview: "SonarQube runs in a withSonarQubeEnv block. If the
        //             quality gate fails (bugs, vulnerabilities, code smells
        //             above threshold), the pipeline aborts before deploy."
        // ────────────────────────────────────────────────────────────────────
        stage('SonarQube Analysis') {
            when {
                expression { !params.SKIP_SONAR }
            }
            steps {
                dir(MAIN_MODULE) {
                    withSonarQubeEnv('SonarQube-Server') {
                        sh """
                            mvn sonar:sonar \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.projectVersion=${BUILD_TAG} \
                                -Dsonar.java.coveragePlugin=jacoco \
                                -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                                -B -ntp
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            when {
                expression { !params.SKIP_SONAR }
            }
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 6: Security Scanning
        // ────────────────────────────────────────────────────────────────────
        stage('Security Scan') {
            parallel {
                stage('OWASP Dependency Check') {
                    steps {
                        dir(MAIN_MODULE) {
                            sh 'mvn org.owasp:dependency-check-maven:check -B -ntp'
                        }
                    }
                    post {
                        always {
                            dependencyCheckPublisher pattern: "${MAIN_MODULE}/target/dependency-check-report.xml"
                        }
                    }
                }

                stage('Trivy FS Scan') {
                    steps {
                        sh "trivy fs --severity HIGH,CRITICAL --exit-code 1 ${MAIN_MODULE}/"
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 7: Publish Artifact to Nexus/Artifactory
        // Interview: "JAR goes to maven-releases, WAR goes to maven-releases
        //             too — same repo, different packaging type. Nexus
        //             repositories organize artifacts by release vs snapshot."
        // ────────────────────────────────────────────────────────────────────
        stage('Publish Artifact') {
            when {
                anyOf {
                    branch 'main'
                    branch 'release/*'
                }
            }
            steps {
                dir(MAIN_MODULE) {
                    script {
                        def artifactExt = params.PACKAGING
                        nexusArtifactUploader(
                            nexusVersion: 'nexus3',
                            protocol: 'https',
                            nexusUrl: "${env.NEXUS_URL}",
                            groupId: 'com.example',
                            version: BUILD_TAG,
                            repository: VERSION.endsWith('-SNAPSHOT') ? 'maven-snapshots' : 'maven-releases',
                            credentialsId: 'nexus-credentials',
                            artifacts: [
                                [
                                    artifactId: SERVICE_NAME,
                                    classifier: '',
                                    file: "target/${SERVICE_NAME}-${VERSION}.${artifactExt}",
                                    type: artifactExt
                                ]
                            ]
                        )
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 8: Docker Build & Push
        // Interview: "Multi-stage Dockerfile — Maven build stage produces
        //             the fat JAR, then copies it to a JRE-slim runtime image.
        //             Non-root user, HEALTHCHECK, UseContainerSupport for
        //             cgroup-aware memory. Image goes to ECR/ACR/Artifact Registry."
        // ────────────────────────────────────────────────────────────────────
        stage('Docker Build & Push') {
            when {
                allOf {
                    expression { params.PACKAGING == 'jar' }
                    anyOf {
                        branch 'main'
                        branch 'develop'
                        branch 'release/*'
                    }
                }
            }
            steps {
                script {
                    // Login to registry based on cloud provider
                    switch (params.CLOUD_PROVIDER) {
                        case 'aws':
                            sh "aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${DOCKER_REGISTRY}"
                            break
                        case 'azure':
                            sh "az acr login --name ${DOCKER_REGISTRY}"
                            break
                        case 'gcp':
                            sh "gcloud auth configure-docker ${DOCKER_REGISTRY}"
                            break
                    }

                    // Build + tag + push
                    dir(MAIN_MODULE) {
                        def image = docker.build("${DOCKER_REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}", """
                            --build-arg JAR_FILE=target/*.jar \
                            --label git.commit=${GIT_COMMIT_SHORT} \
                            --label build.number=${BUILD_NUMBER} \
                            --label build.timestamp=\$(date -u +%Y-%m-%dT%H:%M:%SZ) \
                            .
                        """)

                        image.push()
                        image.push('latest')

                        // Scan the built image
                        sh "trivy image --severity HIGH,CRITICAL --exit-code 0 ${DOCKER_REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 9: WAR Deployment (External Tomcat)
        // Interview: "WAR is for legacy/enterprise environments with shared
        //             Tomcat or WildFly servers. We use Cargo Maven plugin
        //             or SCP + Tomcat manager API for hot deploy."
        // ────────────────────────────────────────────────────────────────────
        stage('WAR Deploy to Tomcat') {
            when {
                allOf {
                    expression { params.PACKAGING == 'war' }
                    expression { params.DEPLOY_ENV != 'none' }
                }
            }
            steps {
                script {
                    def tomcatUrl = "https://tomcat-${params.DEPLOY_ENV}.example.com"
                    withCredentials([usernamePassword(
                        credentialsId: 'tomcat-manager',
                        usernameVariable: 'TOMCAT_USER',
                        passwordVariable: 'TOMCAT_PASS'
                    )]) {
                        dir(MAIN_MODULE) {
                            sh """
                                curl --fail -u "\${TOMCAT_USER}:\${TOMCAT_PASS}" \
                                    -T target/${SERVICE_NAME}-${VERSION}.war \
                                    "${tomcatUrl}/manager/text/deploy?path=/${SERVICE_NAME}&update=true"
                            """
                        }
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 10: Kubernetes Deployment (JAR → Docker → K8s)
        // ────────────────────────────────────────────────────────────────────
        stage('Deploy to Kubernetes') {
            when {
                allOf {
                    expression { params.PACKAGING == 'jar' }
                    expression { params.DEPLOY_ENV != 'none' }
                    anyOf {
                        branch 'main'
                        branch 'release/*'
                    }
                }
            }
            steps {
                script {
                    // Configure kubectl for the target cloud
                    switch (params.CLOUD_PROVIDER) {
                        case 'aws':
                            sh "aws eks update-kubeconfig --name employee-platform-${params.DEPLOY_ENV} --region us-east-1"
                            break
                        case 'azure':
                            sh "az aks get-credentials --resource-group employee-platform-${params.DEPLOY_ENV} --name aks-${params.DEPLOY_ENV}"
                            break
                        case 'gcp':
                            sh "gcloud container clusters get-credentials gke-${params.DEPLOY_ENV} --zone us-central1-a"
                            break
                    }

                    // Update image in Kustomize
                    sh """
                        cd k8s/base
                        kustomize edit set image ${SERVICE_NAME}=${DOCKER_REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}
                    """

                    // Apply with rollout status check
                    sh """
                        kubectl apply -k k8s/overlays/${params.DEPLOY_ENV}/
                        kubectl rollout status deployment/${SERVICE_NAME} \
                            -n employee-platform --timeout=300s
                    """
                }
            }
            post {
                failure {
                    // Automatic rollback on failed deployment
                    sh "kubectl rollout undo deployment/${SERVICE_NAME} -n employee-platform"
                    echo "ROLLBACK executed for ${SERVICE_NAME}"
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // STAGE 11: Smoke Tests
        // ────────────────────────────────────────────────────────────────────
        stage('Smoke Tests') {
            when {
                expression { params.DEPLOY_ENV != 'none' }
            }
            steps {
                script {
                    def baseUrl = params.PACKAGING == 'war'
                        ? "https://tomcat-${params.DEPLOY_ENV}.example.com/${SERVICE_NAME}"
                        : "https://api-${params.DEPLOY_ENV}.example.com"

                    // Health check
                    sh "curl --fail --retry 5 --retry-delay 10 ${baseUrl}/actuator/health"

                    // Critical endpoint verification
                    sh "curl --fail ${baseUrl}/api/v1/employees?page=0&size=1"
                }
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // POST: Notifications + Cleanup
    // ────────────────────────────────────────────────────────────────────────
    post {
        success {
            slackSend(
                channel: SLACK_CHANNEL,
                color: 'good',
                message: """
                    :white_check_mark: *${SERVICE_NAME}* v${BUILD_TAG}
                    Branch: ${env.BRANCH_NAME}
                    Packaging: ${params.PACKAGING.toUpperCase()}
                    Deploy: ${params.DEPLOY_ENV} (${params.CLOUD_PROVIDER})
                    Duration: ${currentBuild.durationString}
                    ${env.BUILD_URL}
                """.stripIndent()
            )
        }

        failure {
            slackSend(
                channel: SLACK_CHANNEL,
                color: 'danger',
                message: """
                    :x: *${SERVICE_NAME}* v${BUILD_TAG} FAILED
                    Branch: ${env.BRANCH_NAME}
                    Stage: ${env.STAGE_NAME}
                    ${env.BUILD_URL}console
                """.stripIndent()
            )
        }

        always {
            cleanWs()
            sh 'docker system prune -f || true'
        }
    }
}
