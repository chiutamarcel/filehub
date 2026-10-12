package com.filehub.api;

import com.filehub.api.services.GroupService;
import com.filehub.api.services.MinioFileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;

//@SpringBootApplication(exclude = { SecurityAutoConfiguration.class })
@SpringBootApplication
public class ApiApplication {

//	GroupService groupService;

	public static void main(String[] args) {
		SpringApplication.run(ApiApplication.class, args);
	}


}
