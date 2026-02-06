package com.example.employee;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.core.env.Environment;

import java.net.InetAddress;
import java.net.UnknownHostException;

@Slf4j
@SpringBootApplication
@EnableDiscoveryClient
public class EmployeeServiceApplication {

    public static void main(String[] args) throws UnknownHostException {
        SpringApplication app = new SpringApplication(EmployeeServiceApplication.class);
        Environment env = app.run(args).getEnvironment();
        
        log.info("\n----------------------------------------------------------\n\t" +
                "Application '{}' is running!\n\t" +
                "Profile(s): \t{}\n\t" +
                "Local: \t\thttp://localhost:{}\n\t" +
                "External: \thttp://{}:{}\n\t" +
                "Actuator: \thttp://localhost:{}/actuator\n" +
                "----------------------------------------------------------",
                env.getProperty("spring.application.name"),
                env.getActiveProfiles(),
                env.getProperty("server.port"),
                InetAddress.getLocalHost().getHostAddress(),
                env.getProperty("server.port"),
                env.getProperty("server.port")
        );
    }
}
