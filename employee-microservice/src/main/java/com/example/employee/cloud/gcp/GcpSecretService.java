package com.example.employee.cloud.gcp;

import com.example.employee.cloud.CloudSecretService;
import com.google.cloud.secretmanager.v1.AccessSecretVersionResponse;
import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
import com.google.cloud.secretmanager.v1.SecretVersionName;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GCP Secret Manager Implementation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How does GCP Secret Manager compare to AWS/Azure?"
 * → GCP Secret Manager is simpler: secrets + versions, no concept of keys/certs.
 *   Paths follow: projects/{project}/secrets/{name}/versions/{version}
 *   IAM granularity: per-secret access binding.
 *   Versioning is first-class: "latest" alias + numeric versions.
 *   Replication: automatic (Google-managed) or user-managed (select regions).
 *   No equivalent to Key Vault HSM or KMS key management — use Cloud KMS separately.
 *
 * Auth: Workload Identity → GCP SA → roles/secretmanager.secretAccessor
 *
 * Activated when: spring.profiles.active=gcp
 */
@Slf4j
@Service
@Profile("gcp")
@RequiredArgsConstructor
public class GcpSecretService implements CloudSecretService {

    private final SecretManagerServiceClient secretManagerClient;

    @Value("${spring.cloud.gcp.project-id:employee-platform}")
    private String projectId;

    @Override
    public String getSecret(String secretName) {
        log.info("GCP Secret Manager: Retrieving secret={}", secretName);

        SecretVersionName versionName = SecretVersionName.of(projectId, secretName, "latest");
        AccessSecretVersionResponse response = secretManagerClient.accessSecretVersion(versionName);

        return response.getPayload().getData().toStringUtf8();
    }

    @Override
    public String getSecretVersion(String secretName, String versionId) {
        log.info("GCP Secret Manager: Retrieving secret={}, version={}", secretName, versionId);

        SecretVersionName versionName = SecretVersionName.of(projectId, secretName, versionId);
        AccessSecretVersionResponse response = secretManagerClient.accessSecretVersion(versionName);

        return response.getPayload().getData().toStringUtf8();
    }
}
