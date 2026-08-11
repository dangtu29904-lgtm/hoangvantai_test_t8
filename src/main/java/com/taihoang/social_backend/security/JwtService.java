package com.taihoang.social_backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class JwtService {
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final Pattern SUBJECT_PATTERN = Pattern.compile("\"sub\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern EXPIRATION_PATTERN = Pattern.compile("\"exp\"\\s*:\\s*(\\d+)");

    private final String secret;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secret = secret;
        this.expirationMs = expirationMs;
    }

    public String generateToken(String email, String role) {
        Instant now = Instant.now();
        long expiration = now.plusMillis(expirationMs).getEpochSecond();
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = "{\"sub\":\"" + escapeJson(email) + "\",\"role\":\"" + escapeJson(role)
                + "\",\"iat\":" + now.getEpochSecond() + ",\"exp\":" + expiration + "}";

        String unsignedToken = encode(header) + "." + encode(payload);
        return unsignedToken + "." + sign(unsignedToken);
    }

    public String extractUsername(String token) {
        try {
            String payload = decodePayload(token);
            Matcher matcher = SUBJECT_PATTERN.matcher(payload);
            return matcher.find() ? matcher.group(1) : null;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username != null
                && username.equals(userDetails.getUsername())
                && !isTokenExpired(token)
                && hasValidSignature(token);
    }

    private boolean isTokenExpired(String token) {
        try {
            String payload = decodePayload(token);
            Matcher matcher = EXPIRATION_PATTERN.matcher(payload);
            if (!matcher.find()) {
                return true;
            }
            long expiration = Long.parseLong(matcher.group(1));
            return Instant.now().getEpochSecond() >= expiration;
        } catch (IllegalArgumentException exception) {
            return true;
        }
    }

    private boolean hasValidSignature(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return false;
            }
            return sign(parts[0] + "." + parts[1]).equals(parts[2]);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String decodePayload(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return "";
        }
        return new String(BASE64_URL_DECODER.decode(parts[1]), StandardCharsets.UTF_8);
    }

    private String encode(String value) {
        return BASE64_URL_ENCODER.encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể tạo JWT signature", exception);
        }
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
