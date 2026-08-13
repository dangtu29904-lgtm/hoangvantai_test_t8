package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.PresenceService;
import com.taihoang.social_backend.dto.PresenceState;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/presence")
@RequiredArgsConstructor
public class PresenceController {
    private final PresenceService presenceService;

    @GetMapping("/{userId}")
    public ResponseEntity<PresenceState> getPresence(@PathVariable Long userId) {
        PresenceState state = presenceService.getPresence(userId);
        return ResponseEntity.ok(state);
    }
}
