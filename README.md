# FileHub

## Description
This was a college project that I worked on together with my classmates.
The development team was comprised of 5 students and we were supposed to adopt SCRUM
methodology which consisted of 2 week sprints and daily scrums.

One of the students had to be a team leader, and another the SCRUM master, while
the other 3 were pure developers. Although, in reality, the SCRUM methodology 
wasn't implemented ad literam, it served us to develop teamworking skills and
simulate a real development environment.

Additionally, we had to implement a CI/CD pipeline running unit tests for each commit
on the dev branch, and they had to pass before merging a release into the main branch.

## Lack of commit history

The repository was initially hosted on our college's local gitlab instance.
Consequentially, the commit history is gone.

## File Structure

```
.
├── README.md
├── backend - Spring Rest API project
│   ├── Dockerfile
│   ├── HELP.md
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── pom.xml
│   ├── src
│   └── target
├── compose.yaml - Docker Compose Manifest file
└── frontend - React frontend Project
```

## Credentials Disclaimer
The credentials residing in the keycload realm config file are only meant to
aid in a quickstart of the application.


## How to run the app 

### Locally via docker

- Run `docker compose up` in root folder to start the MySQL and MinIO containers
- Open the backend project, then compile and run the project

### Kubernetes

There are 2 kubernetes deployments available: dev and prod.

For the prod deployment, you need to generate TLS secrets, and 
configure an NGINX ingress controller.

Edit `kubeconfig.yml` to reflect your kubernetes cluster configuration.

Update `deployment-*.yml` file to match your git registry and other specific information.

Run `start-cluster-remote.bat`.
