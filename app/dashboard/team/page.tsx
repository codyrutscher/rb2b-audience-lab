"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Users, Mail, Shield, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";
import { formatDistanceToNow } from "date-fns";

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    const user = await getCurrentUser();
    if (user) {
      setWorkspaceId(user.id);
      
      // Load team members
      const { data: membersData } = await supabase
        .from('user_workspaces')
        .select('*')
        .eq('workspace_id', user.id);
      
      if (membersData) {
        setMembers(membersData);
      }

      // Load pending invitations
      const { data: invitationsData } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('workspace_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (invitationsData) {
        setInvitations(invitationsData);
      }
    }
  }

  async function sendInvitation() {
    if (!email.trim()) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          status: 'pending',
        });

      if (!error) {
        setEmail("");
        setRole("member");
        setShowInviteForm(false);
        loadTeam();
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
    }
    setSending(false);
  }

  async function revokeInvitation(id: string) {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    
    await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', id);
    
    loadTeam();
  }

  async function removeMember(userId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    await supabase
      .from('user_workspaces')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
    
    loadTeam();
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-2">Invite team members and manage access</p>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {showInviteForm && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Team Member</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                >
                  <option value="member">Member - Can view data</option>
                  <option value="admin">Admin - Can manage settings</option>
                  <option value="owner">Owner - Full access</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={sendInvitation}
                  disabled={sending || !email.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {sending ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Pending Invitations</h2>
            </div>
            <div className="divide-y">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Mail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{invitation.email}</div>
                      <div className="text-sm text-gray-600">
                        Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })} · {invitation.role}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeInvitation(invitation.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          </div>
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{member.email || member.user_id}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span className="capitalize">{member.role}</span>
                      <span>·</span>
                      <span>Joined {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(member.user_id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
                <p className="text-gray-600 mb-4">Invite your first team member to collaborate</p>
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Invite Member
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
