package com.klu.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.klu.dto.NotificationRequest;

@FeignClient(name = "projectnotificationservice")
public interface NotificationClient {

    @PostMapping("/notifications")
    Object createNotification(
            @RequestBody NotificationRequest notification);
}