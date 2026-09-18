FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Usuário não-root que executará o container (substitui o "root").
ARG USERNAME=vitality
ARG USER_UID=1000
ARG USER_GID=1000

USER root

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		curl \
		git \
		unzip \
		postgresql-client \
	&& rm -rf /var/lib/apt/lists/*

RUN npm install -g @angular/cli

RUN npm install -g opencode-ai


# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
	| dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
	&& chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
	| tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
	&& apt-get update \
	&& apt-get install -y gh \
	&& rm -rf /var/lib/apt/lists/*

# Cria o usuário não-root (remove o "node" padrão da imagem, que ocupa UID/GID 1000)
RUN if getent passwd node >/dev/null; then userdel -r node 2>/dev/null || true; fi \
	&& if getent group node >/dev/null; then groupdel node 2>/dev/null || true; fi \
	&& groupadd --gid ${USER_GID} ${USERNAME} \
	&& useradd --uid ${USER_UID} --gid ${USER_GID} -m -s /bin/bash ${USERNAME} \
	&& usermod -aG sudo ${USERNAME} \
	&& echo "${USERNAME} ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
	&& chmod 0440 /etc/sudoers.d/${USERNAME}

# Garante a posse do workspace para o usuário não-root
RUN mkdir -p /vitality-control && chown -R ${USER_UID}:${USER_GID} /vitality-control

WORKDIR /vitality-control

USER ${USERNAME}
