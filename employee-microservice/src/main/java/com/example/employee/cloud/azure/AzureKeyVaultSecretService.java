package com.example.employee.cloud.azure;

import com.azure.security.keyvault.secrets.SecretClient;
import com.example.employee.cloud.CloudSecretService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Azure Key Vault Implementation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How does Azure Key Vault differ from AWS Secrets Manager?"
 * → Key Vault stores 3 types: secrets, keys (HSM-backed), and certificates.
 *   Secrets Manager only stores secrets. Key Vault's key management is
 *   equivalent to AWS KMS + Secrets Manager combined.
 *   Access via Managed Identity + RBAC (no static credentials).
 *   Soft-delete + purge protection = secrets recoverable for 90 days.
 *
 * Auth: Workload Identity → Managed Identity → Key Vault RBAC or Access Policy
 *
 * Activated when: spring.profiles.active=azure
 */
@Slf4j
@Service
@Profile("azure")
@RequiredArgsConstructor
public class AzureKeyVaultSecretService implements CloudSecretService {

    private final SecretClient secretClient;

    @Override
    public String getSecret(String secretName) {
        log.info("Azure Key Vault: Retrieving secret={}", secretName);
        return secretClient.getSecret(secretName).getValue();
    }

    @Override
    public String getSecretVersion(String secretName, String versionId) {
        log.info("Azure Key Vault: Retrieving secret={}, version={}", secretName, versionId);
        return secretClient.getSecret(secretName, versionId).getValue();
    }
}
