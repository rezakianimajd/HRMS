import axiosInstance from '../api/axiosConfig';
import endpoints from '../api/endpoints';

/**
 * Company Engine - Manages company (tenant) switching and state.
 */
class CompanyEngine {
  /**
   * Get all companies accessible by the current user.
   * @returns {Promise<Array>} List of companies
   */
  static async getCompanies() {
    const response = await axiosInstance.get(endpoints.companies.list);
    return response.data;
  }

  /**
   * Get company details by ID.
   * @param {number} companyId
   * @returns {Promise<Object>} Company data
   */
  static async getCompanyById(companyId) {
    const response = await axiosInstance.get(endpoints.companies.detail(companyId));
    return response.data;
  }

  /**
   * Get the current active company.
   * @returns {Promise<Object>} Company data
   */
  static async getCurrentCompany() {
    const response = await axiosInstance.get(endpoints.companies.current);
    return response.data;
  }

  /**
   * Switch the active company.
   * @param {number} companyId
   * @returns {Promise<Object>} Updated company data
   */
  static async switchCompany(companyId) {
    const response = await axiosInstance.post(endpoints.companies.switch, {
      company_id: companyId,
    });

    if (response.data.company) {
      localStorage.setItem('company', JSON.stringify(response.data.company));
    }

    return response.data;
  }

  /**
   * Get stored company from localStorage.
   * @returns {Object|null}
   */
  static getStoredCompany() {
    const companyStr = localStorage.getItem('company');
    if (companyStr) {
      try {
        return JSON.parse(companyStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get the current company ID from localStorage.
   * @returns {number|null}
   */
  static getCurrentCompanyId() {
    const company = this.getStoredCompany();
    return company ? company.id : null;
  }

  /**
   * Set company in localStorage.
   * @param {Object} company
   */
  static setStoredCompany(company) {
    localStorage.setItem('company', JSON.stringify(company));
  }

  /**
   * Clear stored company data.
   */
  static clearCompany() {
    localStorage.removeItem('company');
  }
}

export default CompanyEngine;