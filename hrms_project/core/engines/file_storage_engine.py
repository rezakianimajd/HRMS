"""
File Storage Engine - Handles file storage operations for employee documents.
Manages folder structures per company and employee.
"""
import os
import uuid
from pathlib import Path
from django.conf import settings


class FileStorageEngine:
    """
    Engine for managing file storage operations.
    Creates and manages folder structures for each company and employee.
    """

    def __init__(self):
        """
        Initialize the file storage engine with the base path from settings.
        """
        self.base_path = getattr(settings, 'BASE_FILE_STORAGE_PATH', '/var/hr_data/')
        # Ensure base path exists
        Path(self.base_path).mkdir(parents=True, exist_ok=True)

    def get_employee_folder(self, company_id, employee_id):
        """
        Build the personal folder path for an employee.
        Format: {base_path}/{company_id}/{employee_id}/
        Args:
            company_id: Company (tenant) ID
            employee_id: Employee ID
        Returns:
            str: Full path to employee's folder
        """
        folder_path = os.path.join(
            self.base_path,
            str(company_id),
            str(employee_id)
        )
        return folder_path

    def get_document_path(self, company_id, employee_id, filename):
        """
        Build a unique file path for a document.
        Uses UUID to ensure filename uniqueness.
        Format: {base_path}/{company_id}/{employee_id}/{subfolder}/{uuid}_{original_name}
        Args:
            company_id: Company ID
            employee_id: Employee ID
            filename: Original filename
        Returns:
            str: Full unique file path
        """
        # Extract extension
        name, ext = os.path.splitext(filename)
        # Generate unique name
        unique_name = f"{uuid.uuid4().hex}_{name}{ext}"

        file_path = os.path.join(
            self.base_path,
            str(company_id),
            str(employee_id),
            'documents',
            unique_name
        )
        return file_path

    def save_file(self, file, company_id, employee_id, original_filename):
        """
        Save an uploaded file to the appropriate employee folder.
        Args:
            file: Django UploadedFile object
            company_id: Company ID
            employee_id: Employee ID
            original_filename: Original filename
        Returns:
            dict with 'file_path' (relative) and 'full_path' (absolute)
        """
        # Ensure employee folder exists with sub-folders
        self.create_employee_folder(company_id, employee_id)

        # Build unique file path
        full_path = self.get_document_path(company_id, employee_id, original_filename)

        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        # Save file
        with open(full_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        # Build relative path from base_path
        relative_path = os.path.relpath(full_path, self.base_path)

        return {
            'file_path': relative_path,
            'full_path': full_path,
            'filename': os.path.basename(full_path),
            'original_filename': original_filename,
            'size': os.path.getsize(full_path),
        }

    def delete_file(self, file_path):
        """
        Delete a file from the server.
        Args:
            file_path: Full or relative path to the file
        Returns:
            bool: True if deleted successfully, False otherwise
        """
        # If relative path is given, make it absolute
        if not os.path.isabs(file_path):
            file_path = os.path.join(self.base_path, file_path)

        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except OSError:
            pass
        return False

    def create_employee_folder(self, company_id, employee_id):
        """
        Create the full folder structure for a new employee.
        Creates sub-folders: documents, leaves, payroll, profile
        Args:
            company_id: Company ID
            employee_id: Employee ID
        Returns:
            str: Base folder path
        """
        base_folder = self.get_employee_folder(company_id, employee_id)
        sub_folders = ['documents', 'leaves', 'payroll', 'profile']

        for sub in sub_folders:
            folder = os.path.join(base_folder, sub)
            os.makedirs(folder, exist_ok=True)

        return base_folder

    def list_employee_files(self, company_id, employee_id, sub_folder='documents'):
        """
        List all files in an employee's sub-folder.
        Args:
            company_id: Company ID
            employee_id: Employee ID
            sub_folder: Sub-folder name (default: 'documents')
        Returns:
            list of dicts with file info
        """
        folder = os.path.join(
            self.base_path,
            str(company_id),
            str(employee_id),
            sub_folder
        )

        if not os.path.exists(folder):
            return []

        files = []
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            if os.path.isfile(file_path):
                files.append({
                    'filename': filename,
                    'file_path': os.path.relpath(file_path, self.base_path),
                    'size': os.path.getsize(file_path),
                    'modified': os.path.getmtime(file_path),
                })

        return files

    def get_file_size(self, company_id, employee_id, filename=None, sub_folder='documents'):
        """
        Get the total size of files in an employee's folder or a specific file.
        Args:
            company_id: Company ID
            employee_id: Employee ID
            filename: Optional specific filename
            sub_folder: Sub-folder name
        Returns:
            int: Size in bytes
        """
        folder = os.path.join(
            self.base_path,
            str(company_id),
            str(employee_id),
            sub_folder
        )

        if filename:
            file_path = os.path.join(folder, filename)
            return os.path.getsize(file_path) if os.path.exists(file_path) else 0

        if not os.path.exists(folder):
            return 0

        total_size = 0
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            if os.path.isfile(file_path):
                total_size += os.path.getsize(file_path)

        return total_size

    def get_company_folder(self, company_id):
        """
        Get the base folder path for a company.
        Args:
            company_id: Company ID
        Returns:
            str: Full path to company folder
        """
        return os.path.join(self.base_path, str(company_id))

    def delete_employee_folder(self, company_id, employee_id):
        """
        Delete an entire employee folder and all its contents.
        Args:
            company_id: Company ID
            employee_id: Employee ID
        Returns:
            bool: True if deleted
        """
        import shutil
        folder = self.get_employee_folder(company_id, employee_id)
        try:
            if os.path.exists(folder):
                shutil.rmtree(folder)
                return True
        except OSError:
            pass
        return False