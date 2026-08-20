package com.taihoang.social_backend.configure;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.modelmapper.ModelMapper;

@Configuration
public class Config {
    @Bean
    public ModelMapper modelMapper()
    {
        return new ModelMapper() ;
    }
}
