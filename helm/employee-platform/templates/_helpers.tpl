{{/*
Common helper templates for employee-platform Helm chart.
Interview insight: _helpers.tpl contains Go template functions
reused across all templates (DRY principle in Helm).
*/}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "employee-platform.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to every resource.
*/}}
{{- define "employee-platform.labels" -}}
helm.sh/chart: {{ include "employee-platform.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: employee-platform
environment: {{ .Values.global.environment }}
{{- end }}

{{/*
Selector labels for a specific service.
*/}}
{{- define "employee-platform.selectorLabels" -}}
app: {{ .name }}
app.kubernetes.io/instance: {{ .release }}
{{- end }}

{{/*
Full image path: registry/repository:tag
*/}}
{{- define "employee-platform.image" -}}
{{- if .global.imageRegistry -}}
{{ .global.imageRegistry }}/{{ .image.repository }}:{{ .image.tag | default "latest" }}
{{- else -}}
{{ .image.repository }}:{{ .image.tag | default "latest" }}
{{- end }}
{{- end }}

{{/*
ServiceAccount name for a service.
*/}}
{{- define "employee-platform.serviceAccountName" -}}
{{ .name }}-sa
{{- end }}
