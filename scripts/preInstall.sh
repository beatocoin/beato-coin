#!/bin/sh

echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin 

cd nextjs-template
git fetch
git checkout aqua-beato-nextjs-template
git pull
cd ..
git submodule update --init --recursive 