package com.taihoang.social_backend.configure;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final ObjectProvider<WebSocketAuthInterceptor> webSocketAuthInterceptorProvider ;
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry)
    {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("*") ;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry)
    {
        // client len server
        registry.setApplicationDestinationPrefixes("/app") ;
        //server gui xuong
        registry.enableSimpleBroker("/topic","/queue")
                .setHeartbeatValue(new long[]{10000, 30000})
                .setTaskScheduler(webSocketTaskScheduler()) ;
        // dung cho gui rieng cho tung user
        registry.setUserDestinationPrefix("/user")  ;

    }

    @Bean(name = "webSocketTaskScheduler")
    public ThreadPoolTaskScheduler webSocketTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration)
    {
        registration.interceptors(webSocketAuthInterceptorProvider.getObject())  ;
    }

}
