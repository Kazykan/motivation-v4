from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import os

from motivation.services.push import send_daily_task_reminders, send_weekly_report_reminders


# views/cron.py
class CronDispatchView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def _check_auth(self, request):
        expected = os.environ.get("CRON_SECRET")
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            header = header[len("Bearer "):]
        else:
            header = request.headers.get("X-Cron-Secret")
        return bool(expected and header == expected)

    def get(self, request, job):  # Vercel Cron
        return self._dispatch(request, job)

    def post(self, request, job):  # для ручного/внешнего вызова
        return self._dispatch(request, job)

    def _dispatch(self, request, job):
        if not self._check_auth(request):
            return Response({"detail": "forbidden"}, status=403)
        if job == "weekly":
            return Response({"job": job, "sent": send_weekly_report_reminders()})
        if job == "daily":
            return Response({"job": job, "sent": send_daily_task_reminders()})
        return Response({"detail": "unknown job"}, status=404)