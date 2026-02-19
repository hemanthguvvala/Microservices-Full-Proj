package com.example.employee.controller;

import com.example.employee.dto.JwtResponse;
import com.example.employee.dto.LoginRequest;
import com.example.employee.dto.RegisterRequest;
import com.example.employee.model.Role;
import com.example.employee.model.User;
import com.example.employee.repository.RoleRepository;
import com.example.employee.repository.UserRepository;
import com.example.employee.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Authentication and user registration endpoints")
public class AuthController {
    
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    
    @PostMapping("/login")
    @Operation(summary = "Login user", description = "Authenticate user and return JWT token")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        log.info("Login attempt for user: {}", loginRequest.getUsername());
        
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getUsername(),
                loginRequest.getPassword()
            )
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
        
        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        log.info("User {} logged in successfully", loginRequest.getUsername());
        
        return ResponseEntity.ok(new JwtResponse(jwt, user.getUsername(), user.getEmail(), roles));
    }
    
    @PostMapping("/register")
    @Operation(summary = "Register new user", description = "Create a new user account")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "User registered successfully"),
        @ApiResponse(responseCode = "400", description = "Username or email already exists")
    })
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest) {
        log.info("Registration attempt for user: {}", registerRequest.getUsername());
        
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            log.warn("Registration failed: Username {} already exists", registerRequest.getUsername());
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }
        
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            log.warn("Registration failed: Email {} already exists", registerRequest.getEmail());
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }
        
        // Create new user
        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        
        // Assign roles — public registration always gets ROLE_USER only.
        // ADMIN/MANAGER roles must be assigned by an existing admin via a separate endpoint.
        //
        // Interview: "Why can't users self-assign admin roles during registration?"
        // → "Privilege escalation vulnerability. Any attacker could register as admin
        //    and gain full access to the system. Role elevation must require
        //    authorization from an existing privileged user."
        Set<Role> roles = new HashSet<>();
        Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER)
                .orElseThrow(() -> new RuntimeException("Error: Role not found."));
        roles.add(userRole);
        
        user.setRoles(roles);
        userRepository.save(user);
        
        log.info("User {} registered successfully with roles: {}", registerRequest.getUsername(), roles);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("User registered successfully!");
    }
}
