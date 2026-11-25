
package com.klu.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentRequest {

    private Long complaintId;
    private Long userId;
    private String department;
    private Long staffId;
}
