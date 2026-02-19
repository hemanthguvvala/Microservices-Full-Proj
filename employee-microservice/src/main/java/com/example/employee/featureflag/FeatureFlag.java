package com.example.employee.featureflag;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Feature Flag annotation — enables/disables features without redeployment.
 *
 * Interview: "How do you release features safely to production?"
 * → "We use feature flags (aka feature toggles). The code for the new feature
 * is deployed but disabled. We enable it gradually:
 * 1. Internal users first (canary)
 * 2. 10% of users (A/B test)
 * 3. 100% rollout
 * If something breaks, we disable the flag — no redeployment needed."
 *
 * Interview: "Where do you store feature flags?"
 * → "Redis for fast lookups, with a database fallback. We also support
 * environment variables for simple flags. In production, tools like
 * LaunchDarkly or Unleash provide a UI for non-developers."
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface FeatureFlag {

    /** Name of the feature flag. */
    String value();

    /** Message returned when the feature is disabled. */
    String disabledMessage() default "This feature is currently disabled.";
}
