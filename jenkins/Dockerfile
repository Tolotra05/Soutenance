# Jenkins préconfiguré pour TaskManager (voir JENKINS.md) : plugins, compte
# admin, credential .env et job du pipeline sont créés au démarrage par
# Configuration as Code (casc.yaml) -- aucun assistant d'installation, aucun
# clic.
FROM jenkins/jenkins:2.580.1-lts-jdk21

USER root
# Client Docker + plugins Compose et Buildx seulement : le pipeline pilote le
# Docker de la machine hôte via son socket (monté par docker-compose.yml), il
# ne lance pas de second démon Docker. Buildx est indispensable : sans lui,
# Compose retombe sur l'ancien moteur de build (sans cache BuildKit), qui échoue
# sur Docker Desktop aux COPY --from des Dockerfiles multi-étapes.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && echo "deb [signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin docker-buildx-plugin \
    && rm -rf /var/lib/apt/lists/*
USER jenkins

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY casc.yaml /usr/share/jenkins/ref/casc.yaml
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/casc.yaml \
    JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
