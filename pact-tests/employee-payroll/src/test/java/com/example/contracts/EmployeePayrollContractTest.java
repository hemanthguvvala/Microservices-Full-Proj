package com.example.contracts;

import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static au.com.dius.pact.consumer.dsl.LambdaDsl.newJsonBody;

/**
 * Consumer-Driven Contract Test — Payroll Service (Consumer) → Employee Service (Provider)
 * ==========================================================================================
 * WHAT IS PACT?
 *  Consumer-Driven Contract Testing ensures two services agree on an API contract.
 *  - CONSUMER = payroll-service (needs employee data to calculate pay)
 *  - PROVIDER = employee-service (exposes employee data)
 *
 * HOW IT WORKS:
 *  1. This test (consumer side) defines what payroll-service EXPECTS from employee-service
 *  2. Pact generates a "pact file" (JSON contract) in target/pacts/
 *  3. Publish pact file to Pact Broker (pact.io or self-hosted)
 *  4. Provider verification test in employee-service verifies it honours the contract
 *  5. If provider changes an API in a breaking way → provider tests FAIL → PR blocked
 *
 * WHY BETTER THAN MOCKING?
 *  - Mocks become stale: mock says field X exists, real API removed it
 *  - Pact keeps consumer + provider in sync with real contract
 *  - Enables independent deployments — "can I deploy?" check
 */
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "employee-service")
class EmployeePayrollContractTest {

    // ── Contract 1: Payroll needs employee salary info by ID ─────────
    @Pact(consumer = "payroll-service", provider = "employee-service")
    RequestResponsePact getEmployeeForPayrollCalculation(PactDslWithProvider builder) {
        return builder
            .given("employee with ID 1 exists and is active")  // Provider state
            .uponReceiving("GET employee by ID for payroll calculation")
            .path("/api/v1/employees/1")
            .method("GET")
            .matchHeader("Authorization", "Bearer .+", "Bearer test-token")
            .willRespondWith()
            .status(200)
            .headers(Map.of("Content-Type", "application/json"))
            .body(newJsonBody(body -> {
                // Pact type matchers — payroll only cares about these fields
                body.numberType("id", 1L);
                body.stringType("firstName", "John");
                body.stringType("lastName", "Doe");
                body.stringType("email", "john.doe@company.com");
                body.stringMatcher("department",
                    "ENGINEERING|HR|FINANCE|SALES|OPERATIONS", "ENGINEERING");
                body.stringMatcher("employmentType",
                    "FULL_TIME|PART_TIME|CONTRACT", "FULL_TIME");
                body.numberType("salary", 95000.00);
                body.stringMatcher("status",
                    "ACTIVE|INACTIVE|ON_LEAVE", "ACTIVE");
                body.stringType("taxCode", "1257L");
            }).build())
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getEmployeeForPayrollCalculation")
    void payrollService_canFetchEmployeeData_forPayCalculation(MockServer mockServer) {
        RestTemplate restTemplate = new RestTemplate();
        String url = mockServer.getUrl() + "/api/v1/employees/1";

        // payroll-service calls employee-service to get salary base
        @SuppressWarnings("unchecked")
        Map<String, Object> employee = restTemplate.getForObject(url, HashMap.class);

        // payroll-service only needs these specific fields for calculation
        assertThat(employee).isNotNull();
        assertThat(employee.get("id")).isNotNull();
        assertThat(employee.get("salary")).isNotNull();
        assertThat(employee.get("employmentType")).isNotNull();
        assertThat(employee.get("taxCode")).isNotNull();
        assertThat(employee.get("status")).isEqualTo("ACTIVE");
    }

    // ── Contract 2: Payroll needs employee list by department ────────
    @Pact(consumer = "payroll-service", provider = "employee-service")
    RequestResponsePact getEmployeesByDepartmentForBulkPayroll(PactDslWithProvider builder) {
        return builder
            .given("employees exist in ENGINEERING department")
            .uponReceiving("GET employees by department for bulk payroll run")
            .path("/api/v1/employees")
            .query("department=ENGINEERING&page=0&size=100")
            .method("GET")
            .willRespondWith()
            .status(200)
            .headers(Map.of("Content-Type", "application/json"))
            .body(newJsonBody(body -> {
                body.array("content", arr -> arr.object(obj -> {
                    obj.numberType("id", 1L);
                    obj.stringType("firstName", "John");
                    obj.stringType("lastName", "Doe");
                    obj.numberType("salary", 95000.00);
                    obj.stringMatcher("employmentType",
                        "FULL_TIME|PART_TIME|CONTRACT", "FULL_TIME");
                    obj.stringType("taxCode", "1257L");
                }));
                body.numberType("totalElements", 5);
                body.numberType("totalPages", 1);
                body.booleanType("last", true);
            }).build())
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getEmployeesByDepartmentForBulkPayroll")
    void payrollService_canFetchDepartmentEmployees_forBulkPayrollRun(MockServer mockServer) {
        RestTemplate restTemplate = new RestTemplate();
        String url = mockServer.getUrl() + "/api/v1/employees?department=ENGINEERING&page=0&size=100";

        @SuppressWarnings("unchecked")
        Map<String, Object> page = restTemplate.getForObject(url, HashMap.class);

        assertThat(page).isNotNull();
        assertThat(page.get("content")).isNotNull();
        assertThat(page.get("totalElements")).isNotNull();
    }

    // ── Contract 3: 404 if employee not found ────────────────────────
    @Pact(consumer = "payroll-service", provider = "employee-service")
    RequestResponsePact getEmployee_notFound_returns404(PactDslWithProvider builder) {
        return builder
            .given("employee with ID 9999 does not exist")
            .uponReceiving("GET non-existent employee returns 404")
            .path("/api/v1/employees/9999")
            .method("GET")
            .willRespondWith()
            .status(404)
            .headers(Map.of("Content-Type", "application/json"))
            .body(newJsonBody(body -> {
                body.numberType("status", 404);
                body.stringType("error", "Not Found");
                body.stringType("message", "Employee not found with id: 9999");
            }).build())
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getEmployee_notFound_returns404")
    void payrollService_handles404_whenEmployeeNotFound(MockServer mockServer) {
        RestTemplate restTemplate = new RestTemplate();
        String url = mockServer.getUrl() + "/api/v1/employees/9999";

        try {
            restTemplate.getForObject(url, HashMap.class);
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            assertThat(e.getStatusCode().value()).isEqualTo(404);
        }
    }
}
