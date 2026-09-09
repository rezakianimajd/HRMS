"""Serializers for the Recruitment module."""
from rest_framework import serializers
from recruitment.models import JobRequisition, Candidate, Interview


class InterviewSerializer(serializers.ModelSerializer):
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = Interview
        fields = [
            'id', 'candidate', 'interviewer', 'interview_date',
            'outcome', 'outcome_display', 'score', 'comments', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CandidateSerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    full_name = serializers.SerializerMethodField()
    interviews = InterviewSerializer(many=True, read_only=True)
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id', 'requisition', 'first_name', 'last_name', 'full_name',
            'national_id', 'mobile', 'email', 'resume', 'resume_url',
            'stage', 'stage_display', 'rating', 'notes', 'source',
            'expected_salary', 'interviews', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'

    def get_resume_url(self, obj):
        if obj.resume:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.resume.url)
            return obj.resume.url
        return None


class JobRequisitionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    job_title_name = serializers.CharField(source='job_title.name', read_only=True)
    candidates_count = serializers.IntegerField(read_only=True)
    candidates = CandidateSerializer(many=True, read_only=True)

    class Meta:
        model = JobRequisition
        fields = [
            'id', 'title', 'department', 'department_name', 'job_title', 'job_title_name',
            'work_location', 'headcount', 'status', 'status_display', 'reason',
            'responsibilities', 'requirements', 'requested_by', 'requested_date',
            'budget_salary', 'candidates_count', 'candidates', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']