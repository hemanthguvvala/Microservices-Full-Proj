package com.example.employee;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

/**
 * WAR Deployment Support — External Tomcat / WildFly / JBoss
 *
 * <p>Required when packaging as WAR ({@code mvn package -Pwar-packaging}).
 * Extends {@link SpringBootServletInitializer} so the external servlet container
 * can bootstrap the Spring Boot application via the Servlet 3.0+ API.</p>
 *
 * <h3>JAR vs WAR — Interview Answer:</h3>
 * <ul>
 *   <li><b>JAR (default):</b> Embedded Tomcat. Run with {@code java -jar app.jar}.
 *       Used for Docker/Kubernetes deployments. Self-contained — no external server needed.</li>
 *   <li><b>WAR:</b> Deploys to external Tomcat/WildFly. The {@code spring-boot-starter-tomcat}
 *       dependency is marked {@code <scope>provided</scope>} so the container's Tomcat is used.
 *       This class tells the container how to start Spring Boot.</li>
 * </ul>
 *
 * <h3>When to use WAR:</h3>
 * <ul>
 *   <li>Legacy enterprise environments with shared application servers</li>
 *   <li>Organizations requiring centralized Tomcat/WildFly management</li>
 *   <li>When deploying alongside non-Spring-Boot apps on the same server</li>
 * </ul>
 *
 * <h3>Build commands:</h3>
 * <pre>
 * mvn clean package                  → employee-service-1.0.0.jar (embedded Tomcat)
 * mvn clean package -Pwar-packaging  → employee-service.war (external Tomcat)
 * </pre>
 *
 * @see EmployeeServiceApplication
 */
public class ServletInitializer extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(EmployeeServiceApplication.class);
    }
}
