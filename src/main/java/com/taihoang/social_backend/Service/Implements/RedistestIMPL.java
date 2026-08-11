package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.RedisTestService;
import com.taihoang.social_backend.dto.UserDTO;
import com.taihoang.social_backend.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.modelmapper.ModelMapper;
@Service
public class RedistestIMPL implements RedisTestService
{
    @Autowired
    private JwtService jwt ;
    @Autowired
    private UserRepository userRepo ;
    @Autowired
    private ModelMapper model ;
    @Cacheable(value= "user",key="#token")
    @Override
    public UserDTO RedisTest(String token) {
        String mail = jwt.extractUsername(token) ;
        if(mail==null )
        {
            throw new RuntimeException("token cua ban da het han hoac sai token") ;
        }
        System.out.println(mail);
        User user = userRepo.findByEmail(mail).orElseThrow(()->new RuntimeException("sai email")) ;
        UserDTO userDTO = model.map(user,UserDTO.class)  ;
        return userDTO;
    }
}
