package com.filehub.api.repositories;

import com.filehub.api.models.ProfilePicture;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProfilePictureRepository extends JpaRepository<ProfilePicture, String> {

    Optional<ProfilePicture> findByUsername(String username);

    boolean existsByUsername(String username);
}
