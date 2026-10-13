import { useCallback, useEffect, useState } from "react";

import {
  approveAccessRequest,
  deleteAccessRequest,
  getAccessRequests,
  rejectAccessRequest,
} from "../services/accessRequestsService.js";
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserAccess,
} from "../services/adminUsersService.js";

export default function useAdminAccessData({
  enabled,
  canViewUsers,
  canViewRequests,
  currentUserRole,
  canManageRequests,
  canGrantAdmin,
  canManageAccess,
}) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErrorKey, setUsersErrorKey] = useState("");
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [processingUserId, setProcessingUserId] = useState(null);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsErrorKey, setRequestsErrorKey] = useState("");
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const reloadUsers = useCallback(async () => {
    if (!canViewUsers) {
      return [];
    }

    const nextUsers = await getAdminUsers();
    setUsers(nextUsers);
    setUsersLoaded(true);
    return nextUsers;
  }, [canViewUsers]);

  useEffect(() => {
    if (!enabled || !canViewUsers || usersLoaded) {
      return undefined;
    }

    let active = true;

    async function loadUsers() {
      setUsersLoading(true);
      setUsersErrorKey("");

      try {
        const nextUsers = await getAdminUsers();

        if (active) {
          setUsers(nextUsers);
          setUsersLoaded(true);
        }
      } catch (error) {
        console.error("Load admin users:", error);

        if (active) {
          setUsersErrorKey("load");
        }
      } finally {
        if (active) {
          setUsersLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, [enabled, canViewUsers, usersLoaded]);

  useEffect(() => {
    if (!enabled || !canViewRequests || requestsLoaded) {
      return undefined;
    }

    let active = true;

    async function loadRequests() {
      setRequestsLoading(true);
      setRequestsErrorKey("");

      try {
        const nextRequests = await getAccessRequests();

        if (active) {
          setRequests(nextRequests);
          setRequestsLoaded(true);
        }
      } catch (error) {
        console.error("Load requests:", error);

        if (active) {
          setRequestsErrorKey("load");
        }
      } finally {
        if (active) {
          setRequestsLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      active = false;
    };
  }, [enabled, canViewRequests, requestsLoaded]);

  async function saveUser(user, values) {
    if (!canManageAccess) throw new Error("ACCESS_DENIED");
    setProcessingUserId(user.id);
    setUsersErrorKey("");

    try {
      await updateAdminUserAccess(user.id, values);
      await reloadUsers();
    } catch (error) {
      console.error("Save user access:", error);
      setUsersErrorKey("save");
      throw error;
    } finally {
      setProcessingUserId(null);
    }
  }

  async function deleteUser(user) {
    if (!canManageAccess) return false;
    setProcessingUserId(user.id);
    setUsersErrorKey("");

    try {
      await deleteAdminUser(user.id);
      await reloadUsers();
      return true;
    } catch (error) {
      console.error("Delete user:", error);
      setUsersErrorKey("delete");
      return false;
    } finally {
      setProcessingUserId(null);
    }
  }

  function changeRequestRole(requestId, role) {
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? { ...request, requestedRole: role }
          : request,
      ),
    );
  }

  async function approveRequest(request) {
    if (!canManageRequests) return;
    setProcessingRequestId(request.id);
    setRequestsErrorKey("");

    try {
      await approveAccessRequest({
        request,
        selectedRole: request.requestedRole || "consul",
        currentUserRole,
        canManageRequests,
        canGrantAdmin,
      });
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, status: "approved" } : item,
        ),
      );
      await reloadUsers();
    } catch (error) {
      console.error("Approve request:", error);
      setRequestsErrorKey(
        error.message === "ADMIN_CANNOT_GRANT_ADMIN"
          ? "onlyOwnerAdmin"
          : "approve",
      );
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function rejectRequest(request) {
    if (!canManageRequests) return;
    setProcessingRequestId(request.id);
    setRequestsErrorKey("");

    try {
      await rejectAccessRequest(request.id);
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, status: "rejected" } : item,
        ),
      );
    } catch (error) {
      console.error("Reject request:", error);
      setRequestsErrorKey("reject");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function deleteRequest(request) {
    if (!canManageRequests) return;
    setProcessingRequestId(request.id);
    setRequestsErrorKey("");

    try {
      await deleteAccessRequest(request.id);
      setRequests((current) =>
        current.filter((item) => item.id !== request.id),
      );
    } catch (error) {
      console.error("Delete request:", error);
      setRequestsErrorKey("delete");
    } finally {
      setProcessingRequestId(null);
    }
  }

  return {
    users,
    usersLoading:
      enabled && canViewUsers && !usersLoaded ? true : usersLoading,
    usersErrorKey,
    processingUserId,
    requests,
    requestsLoading:
      enabled && canViewRequests && !requestsLoaded ? true : requestsLoading,
    requestsErrorKey,
    processingRequestId,
    saveUser,
    deleteUser,
    changeRequestRole,
    approveRequest,
    rejectRequest,
    deleteRequest,
  };
}
