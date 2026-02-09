package com.example.notification.strategy;

import com.example.notification.model.Notification.ChannelType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Strategy Factory — Selects the right strategy at runtime.
 *
 * Interview Insight:
 *   "How do you avoid if/else chains when selecting a strategy?"
 *   → "Inject ALL strategies via List<NotificationStrategy>, then build
 *      a Map<ChannelType, Strategy> in the constructor. Lookup is O(1).
 *      Adding a new channel = create a new @Component — zero changes
 *      to existing code (Open/Closed Principle)."
 *
 *   "What happens if Spring finds no strategy for a channel?"
 *   → "The factory throws an exception. This is fail-fast behavior —
 *      better to crash with a clear error than silently do nothing."
 *
 * This pattern is also called the "Strategy Registry" or "Plugin Architecture".
 */
@Component
@Slf4j
public class NotificationStrategyFactory {

    private final Map<ChannelType, NotificationStrategy> strategyMap;

    /**
     * Constructor injection — Spring auto-discovers all NotificationStrategy beans
     * and injects them as a List. We convert to a Map for O(1) lookup.
     */
    public NotificationStrategyFactory(List<NotificationStrategy> strategies) {
        this.strategyMap = strategies.stream()
                .flatMap(strategy -> {
                    // Each strategy can support multiple channel types
                    return java.util.Arrays.stream(ChannelType.values())
                            .filter(strategy::supports)
                            .map(type -> Map.entry(type, strategy));
                })
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        log.info("Registered {} notification strategies: {}",
                strategyMap.size(), strategyMap.keySet());
    }

    /**
     * Get the strategy for a given channel type.
     *
     * @throws IllegalArgumentException if no strategy is registered for the channel
     */
    public NotificationStrategy getStrategy(ChannelType channelType) {
        NotificationStrategy strategy = strategyMap.get(channelType);
        if (strategy == null) {
            throw new IllegalArgumentException(
                    "No notification strategy registered for channel: " + channelType);
        }
        return strategy;
    }

    public boolean hasStrategy(ChannelType channelType) {
        return strategyMap.containsKey(channelType);
    }
}
