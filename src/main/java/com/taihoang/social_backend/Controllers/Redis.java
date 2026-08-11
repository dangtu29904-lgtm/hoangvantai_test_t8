package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.RedisTestService;
import com.taihoang.social_backend.dto.UserDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class Redis {
    @Autowired
    private RedisTestService redis ;
    @GetMapping("/user/redis")
    public ResponseEntity<UserDTO> TestRedis(@RequestHeader("Authorization")String auth )
    {
        String token = auth.substring(7);
        return new ResponseEntity<>(redis.RedisTest(token) , HttpStatus.OK) ;
    }
}
