KEYCLOAK_HOST=keycloak
KEYCLOAK_PORT=8180
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin

CLIENT_ID="filehub-rest-api"
REALM="FileHub"

source ./wait-for-it.sh $KEYCLOAK_HOST $KEYCLOAK_PORT 0

# Check the return status of wait-for-it.sh
if [[ $? -eq 0 ]]; then
    echo "Keycloak is up and running!"
else
    echo "Keycloak failed to start within the timeout."
    exit 1
fi

# mkdir /data
# mkdir /data/testuser

minio server /data --console-address :9001