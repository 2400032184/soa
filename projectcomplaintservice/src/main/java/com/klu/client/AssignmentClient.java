
package com.klu.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.klu.dto.AssignmentRequest;

@FeignClient(name = "projectassignmentservice")
public interface AssignmentClient {

    @PostMapping("/assignments")
    Object createAssignment(@RequestBody AssignmentRequest request);

    @GetMapping("/assignments/complaint/{complaintId}/staff/{staffId}")
    Object getStaffAssignment(
            @PathVariable("complaintId") Long complaintId,
            @PathVariable("staffId") Long staffId);
}
