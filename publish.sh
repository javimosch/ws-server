#!/bin/bash

# Exit on error
set -e

# Variables
IMAGE_NAME="javimosch/ws-server"
TAG="latest"

# Build the Docker image
echo "Building Docker image..."
docker build -t $IMAGE_NAME:$TAG .

# Tag the image
echo "Tagging image as $IMAGE_NAME:$TAG"
docker tag $IMAGE_NAME:$TAG $IMAGE_NAME:$TAG

# Push to Docker registry
echo "Pushing image to Docker registry..."
docker push $IMAGE_NAME:$TAG

echo "Image successfully published to $IMAGE_NAME:$TAG"
