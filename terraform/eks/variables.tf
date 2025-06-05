variable "cluster_name" {
  default = "app-signals-demo"
}

variable "cloudwatch_observability_addon_version" {
  default = "v1.5.1-eksbuild.1"
}

variable "ebs_csi_addon_version" {
  default = "v1.41.0-eksbuild.1"
}

variable "isengard_admin_role_arn" {
  description = "ARN of the Isengard admin role"
  type        = string
}