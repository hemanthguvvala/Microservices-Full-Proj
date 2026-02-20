package com.example.employee.cloud.aws;

import com.example.employee.cloud.CloudSecretService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AWS Secrets Manager Implementation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How do you manage secrets at runtime?"
 * → External Secrets Operator syncs from AWS Secrets Manager into K8s Secrets
 *   (used for DB passwords, API keys at pod startup).
 *   This service is for RUNTIME secret lookups — rotating API keys,
 *   dynamic credentials (e.g., STS temporary tokens).
 *   Access controlled by IRSA — pod's service account has IAM role
 *   scoped to specific secret ARNs only.
 *
 * Activated when: spring.profiles.active=aws
 */
@Slf4j
@Service
@Profile("aws")
@RequiredArgsConstructor
public class AwsSecretService implements CloudSecretService {

    private final SecretsManagerClient secretsManagerClient;

    @Override
    public String getSecret(String secretName) {
        log.info("AWS Secrets Manager: Retrieving secret={}", secretName);

        GetSecretValueRequest request = GetSecretValueRequest.builder()
                .secretId(secretName)
                .build();

        return secretsManagerClient.getSecretValue(request).secretString();
    }

    @Override
    public String getSecretVersion(String secretName, String versionId) {
        log.info("AWS Secrets Manager: Retrieving secret={}, version={}", secretName, versionId);

        GetSecretValueRequest request = GetSecretValueRequest.builder()
                .secretId(secretName)
                .versionId(versionId)
                .build();

        return secretsManagerClient.getSecretValue(request).secretString();
    }
}
