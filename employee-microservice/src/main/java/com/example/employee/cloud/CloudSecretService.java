package com.example.employee.cloud;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Cloud Secret Manager Abstraction
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How do you manage secrets in a multi-cloud environment?"
 * → K8s External Secrets Operator syncs from cloud-native secret stores
 *   (AWS Secrets Manager / Azure Key Vault / GCP Secret Manager) into K8s Secrets.
 *   For runtime lookups (e.g., rotating API keys), this interface provides
 *   direct access to the cloud secret store with profile-based switching.
 */
public interface CloudSecretService {

    /**
     * Retrieve a secret value by name.
     *
     * @param secretName The secret identifier
     * @return The secret value (plaintext)
     */
    String getSecret(String secretName);

    /**
     * Retrieve a specific version of a secret.
     *
     * @param secretName The secret identifier
     * @param versionId  The version ID or stage label
     * @return The secret value
     */
    String getSecretVersion(String secretName, String versionId);
}
