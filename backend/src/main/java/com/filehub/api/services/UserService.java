package com.filehub.api.services;

import com.filehub.api.dtos.UserDTO;
import com.filehub.api.models.GroupLeader;
import com.filehub.api.models.ProfilePicture;
import com.filehub.api.repositories.GroupLeaderRepository;
import com.filehub.api.repositories.ProfilePictureRepository;
import jakarta.ws.rs.core.Response;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.DOMImplementation;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.*;

@Service
public class UserService {

    @Autowired
    private final Keycloak keycloak;
    private final MinioFileService minioFileService;
    private final ProfilePictureRepository profilePictureRepository;
    private final GroupLeaderRepository groupLeaderRepository;

    @Value("${filehub.kc.realm}")
    private String realmName;

    public UserDTO createUser(UserDTO userDTO) throws Exception {
        if (userDTO.getUsername().contains(" ")) {
            throw new IllegalArgumentException("Username cannot contain spaces.");
        }
        if (userDTO.getPassword().contains(" ") ) {
            throw new IllegalArgumentException("Password cannot contain spaces.");
        }
        String emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        if (userDTO.getEmail()== null || !userDTO.getEmail().matches(emailRegex)) {
            throw new IllegalArgumentException("Invalid email format.");
        }

        // Checking if the user already exists
        if (userExists(userDTO.getUsername())) {
            throw new IllegalArgumentException("Username already in use.");
        }

        // Checking if the user already exists by email
        if (emailExists(userDTO.getEmail())) {
            throw new IllegalArgumentException("Email already in use.");
        }

        // Creating a new user
        UserRepresentation userRepresentation = new UserRepresentation();
        userRepresentation.setUsername(userDTO.getUsername());
        userRepresentation.setEmail(userDTO.getEmail());
        userRepresentation.setEnabled(true);

        // Adding custom attributes
        Map<String, List<String>> attributes = new HashMap<>();

        attributes.put("birthdate", Collections.singletonList(userDTO.getBirthdate()));
        attributes.put("profilePic", Collections.singletonList(userDTO.getProfilePic()));
        attributes.put("storageId", Collections.singletonList(String.valueOf(userDTO.getStorageId())));
        attributes.put("policy", Collections.singletonList(String.valueOf("consoleAdmin"))); // TODO: set this properly

        userRepresentation.setAttributes(attributes);

        // Adding user to Keycloak
        Response response = keycloak.realm(realmName).users().create(userRepresentation);

        if (response.getStatus() != 201) {
            throw new RuntimeException("Failed to create user in Keycloak: " + response.getStatusInfo());
        }

        // Setting the password for the user
        String userId = extractUserIdFromResponse(response);
        CredentialRepresentation passwordCredential = createPasswordCredential(userDTO.getPassword());
        keycloak.realm(realmName).users().get(userId).resetPassword(passwordCredential);

        // Retrieve the created user to get the createdTimestamp
        UserRepresentation createdUser = keycloak.realm(realmName).users().get(userId).toRepresentation();
        Long createdTimestamp = createdUser.getCreatedTimestamp();
        userDTO.setUserId(userId);
        userDTO.setCreatedAt(Instant.ofEpochMilli(createdTimestamp).toString()); // Convert to ISO-8601 format

        // Assign role to the user
        assignClientRoleToUser(userId, userDTO.getRole());

        if(userDTO.getRole() == null) {
            userDTO.setRole("filehub_user");
        }

        this.minioFileService.createBucket(userDTO.getUsername().toLowerCase(), true);

        return userDTO;
    }

    public UserDTO updateUser(String username, UserDTO userDTO) throws Exception {
//        // Retrieve the access token
//        String accessToken = getAccessToken();
//
        // Get the user from Keycloak based on username
        var users = keycloak.realm(realmName).users().search(username);
        if (users.isEmpty()) {
            throw new NoSuchElementException("User not found.");
        }
//        if (userDTO.getUsername().contains(" ")) {
//            throw new IllegalArgumentException("Username cannot contain spaces.");
//        }
        // Get userId from the first match (assuming unique usernames)
        String userId = users.get(0).getId();

        // Fetch existing user details from Keycloak
        UserRepresentation userRepresentation = keycloak.realm(realmName).users().get(userId).toRepresentation();

        // Verify and update attributes
        String updatedUsername = userDTO.getUsername() != null ? userDTO.getUsername() : userRepresentation.getUsername();
        String updatedEmail = userDTO.getEmail() != null ? userDTO.getEmail() : userRepresentation.getEmail();

        // Merge attributes
        Map<String, List<String>> updatedAttributes = new HashMap<>();
        if (userRepresentation.getAttributes() != null) {
            updatedAttributes.putAll(userRepresentation.getAttributes());
        }
        if (userDTO.getBirthdate() != null) {
            updatedAttributes.put("birthdate", Collections.singletonList(userDTO.getBirthdate()));
        } else if (userRepresentation.getAttributes() != null && userRepresentation.getAttributes().containsKey("birthdate")) {
            updatedAttributes.put("birthdate", userRepresentation.getAttributes().get("birthdate"));
        }
        if (userDTO.getProfilePic() != null) {
            updatedAttributes.put("profilePic", Collections.singletonList(userDTO.getProfilePic()));
        } else if (userRepresentation.getAttributes() != null && userRepresentation.getAttributes().containsKey("profilePic")) {
            updatedAttributes.put("profilePic", userRepresentation.getAttributes().get("profilePic"));
        }
        if (userDTO.getStorageId() != null) {
            updatedAttributes.put("storageId", Collections.singletonList(String.valueOf(userDTO.getStorageId())));
        } else if (userRepresentation.getAttributes() != null && userRepresentation.getAttributes().containsKey("storageId")) {
            updatedAttributes.put("storageId", userRepresentation.getAttributes().get("storageId"));
        }

        // Push updated user to keycloak
        userRepresentation.setAttributes(updatedAttributes);

        if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
            CredentialRepresentation passwordCredential = createPasswordCredential(userDTO.getPassword());
            keycloak.realm(realmName).users().get(userId).resetPassword(passwordCredential);
        }

        if (userDTO.getRole() != null) {
            updateClientRoleForUser(userId, userDTO.getRole());
        }

        keycloak.realm(realmName).users().get(userId).update(userRepresentation);

        // Return updated user representation from keycloak
        var userResource = keycloak.realm(realmName).users().get(userId);
        var updatedUser = userResource.toRepresentation();

        return mapToUserDTO(updatedUser);
    }

    public void deleteUser(String username) throws Exception {
        // Checking if user exists
        if(!userExists(username)) {
            throw new NoSuchElementException("User not found.");
        }

        var users = keycloak.realm(realmName).users().search(username);

        // Deleting user
        Response response = keycloak.realm(realmName).users().delete(users.get(0).getId());
        if(response.getStatus() != 204){
            throw new RuntimeException("Failed to delete user in Keycloak: "+ response.getStatusInfo());
        }

        // Delete related group leader entries
        List<GroupLeader> groupLeaders = groupLeaderRepository.findByLeader(username);
        if (!groupLeaders.isEmpty()) {
            groupLeaderRepository.deleteAll(groupLeaders);
            System.out.println("Deleted all group leader entries for user: " + username);
        }

        deleteProfilePicture(username);

        this.minioFileService.deleteBucket(username.toLowerCase(), true);
    }

    public UserDTO getUser(String username) {
        try {
            var users = keycloak.realm(realmName).users().search(username);
            // Check if user exists

            if (users.isEmpty()) {
                throw new NoSuchElementException("User not found.");
            }


            UserRepresentation userRepresentation = users.get(0);
            return mapToUserDTO(userRepresentation);
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve user from Keycloak: " + e.getMessage(), e);
        }
    }

    public List<UserDTO> listAllUsers() {
        try {
            // Fetch all users from Keycloak
            UsersResource usersResource = keycloak.realm(realmName).users();
            List<UserRepresentation> userRepresentations = usersResource.list();

            // Map the UserRepresentation objects to UserDTO objects
            List<UserDTO> users = new ArrayList<>();
            for (UserRepresentation userRepresentation : userRepresentations) {
                users.add(mapToUserDTO(userRepresentation));
            }

            return users;
        } catch (Exception e) {
            throw new RuntimeException("Failed to list users: " + e.getMessage(), e);
        }
    }

    private void updateClientRoleForUser(String userId, String newRoleName) {
        var realmResource = keycloak.realm(realmName);

        // Fetch the client
        var clientRepresentation = realmResource.clients().findByClientId("filehub-rest-api").get(0);
        String clientInternalId = clientRepresentation.getId(); // Internal client ID

        // Remove all existing client roles
        var userResource = realmResource.users().get(userId);
        List<RoleRepresentation> existingRoles = userResource.roles().clientLevel(clientInternalId).listAll();
        if (!existingRoles.isEmpty()) {
            userResource.roles().clientLevel(clientInternalId).remove(existingRoles);
        }

        // Assign the new role
        assignClientRoleToUser(userId, newRoleName);
    }

    private void assignClientRoleToUser(String userId, String roleName) {
        var realmResource = keycloak.realm(realmName);

        String role = roleName != null ? roleName : "filehub_user";

        // Fetch the client
        var clientRepresentation = realmResource.clients().findByClientId("filehub-rest-api").get(0);
        String clientInternalId = clientRepresentation.getId(); // Internal client ID

        // Fetch the client role
        var clientRole = realmResource.clients().get(clientInternalId).roles().get(role).toRepresentation();

        if (clientRole == null) {
            throw new IllegalArgumentException("Client role not found: " + role);
        }

        // Assign the role to the user
        var userResource = realmResource.users().get(userId);
        userResource.roles().clientLevel(clientInternalId).add(Collections.singletonList(clientRole));
    }

    private UserDTO mapToUserDTO(UserRepresentation userRepresentation) {
        Map<String, List<String>> attributes = userRepresentation.getAttributes() != null ? userRepresentation.getAttributes() : Collections.emptyMap();

        var clientRepresentation = keycloak.realm(realmName).clients().findByClientId("filehub-rest-api").get(0);
        String clientId = clientRepresentation.getId();
        var roles = keycloak.realm(realmName).users().get(userRepresentation.getId()).roles().clientLevel(clientId).listEffective();

        return new UserDTO(
                userRepresentation.getId(),
                attributes.containsKey("profilePic") ? attributes.get("profilePic").get(0) : null,
                userRepresentation.getUsername(),
                userRepresentation.getEmail(),
                "you wish", // Password will never be retrieved because of security reasons
                roles.get(0).getName(),
                attributes.containsKey("birthdate") ? attributes.get("birthdate").get(0) : null,
                userRepresentation.getCreatedTimestamp().toString(),
                attributes.containsKey("storageId") ? Integer.parseInt(attributes.get("storageId").get(0)) : 0
        );
    }

    private CredentialRepresentation createPasswordCredential(String password) {
        CredentialRepresentation credential = new CredentialRepresentation();

        credential.setTemporary(false);
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(password);
        return credential;
    }

    private String extractUserIdFromResponse(Response response) {
        String locationHeader = response.getHeaderString("Location");
        return locationHeader.substring(locationHeader.lastIndexOf("/")+1);
    }

    private boolean userExists(String username) {
        var users = keycloak.realm(realmName).users().search(username);
        return users.stream().anyMatch(user -> username.equals(user.getUsername()));
    }

    private boolean emailExists(String email) {
        List<UserRepresentation> users = keycloak.realm(realmName).users().search(null, null, null, email, 0, 1);
        return !users.isEmpty();
    }

    public String saveProfilePicture(String username, MultipartFile file) throws Exception {
        if (file.isEmpty() || username == null || username.isEmpty()) {
            throw new IllegalArgumentException("File or username cannot be null or empty.");
        }

        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equals("image/png") && !contentType.equals("image/jpeg"))) {
            throw new IllegalArgumentException("Only PNG and JPG images are supported.");
        }

        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        if (originalImage == null) {
            throw new IllegalArgumentException("Unsupported image format.");
        }

        int targetWidth = 100;
        int targetHeight = 100;
        BufferedImage resizedImage = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_ARGB);

        resizedImage.getGraphics().drawImage(
                originalImage.getScaledInstance(targetWidth, targetHeight, java.awt.Image.SCALE_SMOOTH),
                0, 0, null
        );

        String svgContent = convertImageToSvg(resizedImage);

        Optional<ProfilePicture> existingProfilePicture = profilePictureRepository.findByUsername(username);

        if (existingProfilePicture.isPresent()) {
            ProfilePicture profilePicture = existingProfilePicture.get();
            profilePicture.setProfilePictureSvg(svgContent);
            profilePictureRepository.save(profilePicture);
        } else {
            ProfilePicture newProfilePicture = new ProfilePicture(username, svgContent);
            profilePictureRepository.save(newProfilePicture);
        }

        return svgContent;
    }



    private String convertImageToSvg(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        StringBuilder svgBuilder = new StringBuilder();

        svgBuilder.append("<svg xmlns=\"http://www.w3.org/2000/svg\" ")
                .append("width=\"").append(width).append("\" ")
                .append("height=\"").append(height).append("\" ")
                .append("viewBox=\"0 0 ").append(width).append(" ").append(height).append("\">")
                .append("<image href=\"data:image/png;base64,");

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", outputStream);
            String base64Image = Base64.getEncoder().encodeToString(outputStream.toByteArray());
            svgBuilder.append(base64Image);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encode image to Base64.", e);
        }

        svgBuilder.append("\" ")
                .append("width=\"").append(width).append("\" ")
                .append("height=\"").append(height).append("\"/>")
                .append("</svg>");

        return svgBuilder.toString();
    }

    public String getProfilePicture(String username) {
        return profilePictureRepository.findByUsername(username)
                .map(ProfilePicture::getProfilePictureSvg)
                .orElseThrow(() -> new NoSuchElementException("Profile picture not found for user: " + username));
    }

    public void deleteProfilePicture(String username) {
        if (profilePictureRepository.existsByUsername(username)) {
            profilePictureRepository.deleteById(username);
        }
    }

    public UserService(Keycloak keycloak, MinioFileService minioFileService, ProfilePictureRepository profilePictureRepository, GroupLeaderRepository groupLeaderRepository) {
        this.keycloak = keycloak;
        this.minioFileService = minioFileService;
        this.profilePictureRepository = profilePictureRepository;
        this.groupLeaderRepository = groupLeaderRepository;
    }

}
